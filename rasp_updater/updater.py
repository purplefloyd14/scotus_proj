import sys
sys.path.append('..')

from datetime import datetime
from xml_utils import utils as xml_utils
from data_scrape import get as ds_get
from data_scrape import get_utils as ds_get_utils
from urllib.request import urlopen
import xml.etree.ElementTree as ET
import time
import os
from parser import MyHTMLParser
from github_upload import push_utils
import datetime
import logging

logging.basicConfig(filename="../prod.log", level=logging.INFO)

def get_prod_xml_url():
    return 'https://purplefloyd14.github.io/prod.xml'
    #this is very important | /dev.xml or /prod.xml
    #this controls where things happen
    #downloads from github and uploads to github occur from this address

def get_temp_file_info_dict():
    #location of temp dir
    info = {}
    info['temp_dir'] = 'temp'
    info['temp_loc'] = os.getcwd()
    info['temp_file'] = 'temp.xml'
    return info

def update_needed_bool():
    #do we need to do an update
    prod_xml_url = get_prod_xml_url()
    driver = ds_get_utils.open_driver()
    msg = f"Checking for updates: Comparing XML @ {prod_xml_url} against Court website"
    print(msg)
    logging.info(msg)
    driver.delete_all_cookies() #not sure why, but added this as a fix for something, found it on stack overflow
    number_of_items_on_scotus_site = ds_get_utils.count_cases_on_scotus_site(driver)
    number_of_items_on_prod_xml_feed = xml_utils.count_items_on_prod_feed(prod_xml_url)
    ds_get_utils.close_driver(driver)
    time_stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    if number_of_items_on_scotus_site == number_of_items_on_prod_xml_feed:
        info_str = f"{time_stamp} | We're good - no update needed."
        print(info_str)
        logging.info(info_str)
        return False #no update needed
    elif number_of_items_on_scotus_site > number_of_items_on_prod_xml_feed:
        diff = number_of_items_on_scotus_site - number_of_items_on_prod_xml_feed
        info_str2 = f"We need to update. XML is missing {diff} items."
        print(info_str2)
        logging.info(info_str2)
        return True #update needed
    else:
        problem = "Something is wrong: The Court's site has less items than the XML does."
        print(problem)
        logging.info(problem)


def update():
    time_stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    out_str = f" ------------------------------------------------------------------ \n{time_stamp} | Starting Update Process.."
    print(out_str)
    logging.info(out_str)
    #this is the main function that the program runs. This kicks everything off.
    we_need_to_update = update_needed_bool()
    if we_need_to_update:
        save_file_to_local()
        add_new_episodes_to_local_prod_xml(new_first=True)
        info = get_temp_file_info_dict()
        push_utils.push_local_prod_to_github(info)


def populate():
    time_stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    out_str = f"{time_stamp} | Starting Puplate Process.."
    print(out_str)
    logging.info(out_str)
    #should only be run when there is a new (unpopulated template)
    #if running this, template should be @ dev.xml, so point URL there
    we_need_to_update = update_needed_bool()
    if we_need_to_update:
        save_file_to_local()
        add_new_episodes_to_local_prod_xml(new_first=False)
        info = get_temp_file_info_dict()
        push_utils.push_local_prod_to_github(info)


def add_new_episodes_to_local_prod_xml(new_first):
    driver = ds_get_utils.open_driver() #open driver
    url = get_prod_xml_url() #grab it from above
    years_arr = sorted(ds_get_utils.get_list_of_available_years(driver))
    #list of all years that court site has audio for
    if new_first:
        #work from newest recent to oldest (put newest-year-first in list)
        years_arr = sorted(years_arr, reverse=True)
    info = get_temp_file_info_dict()
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    full_path_to_temp_dir = os.path.join(temp_loc, temp_dir, temp_file)
    for year in years_arr:
        urls_on_site = ds_get_utils.get_case_urls_from_year_page(year, driver) #get list of case-page urls in year
        urls_on_local_prod_xml_feed = xml_utils.get_urls_present_in_local_prod_xml_file_for_year(year, full_path_to_temp_dir)
        # ^ get episodes presennt on feed for year
        if len(urls_on_site) == len(urls_on_local_prod_xml_feed):
            #if they are the same length, no update needed
            continue
        elif len(urls_on_site) > len(urls_on_local_prod_xml_feed):
            #if the court has more cases than the feed does, add those cases to the feed
            info = f"Making updates for {year}"
            print(info)
            logging.info(info)
            add_new_elements(year) #add elements to xml file in temp
    status = f'Finished adding new elements to local XML.'
    print(status)
    logging.info(status)
    ds_get_utils.close_driver(driver)

def save_file_to_local():
    #create temp folder structure and then save xml file from github to it
    info = get_temp_file_info_dict()
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    parser = MyHTMLParser()
    full_path_to_temp_file = os.path.join(temp_loc, temp_dir, temp_file)
    url=get_prod_xml_url()
    ds_get_utils.create_folder(temp_dir, temp_loc)
    xml_utils.save_xml_file_to_local(url, full_path_to_temp_file, parser)


def add_new_elements(year):
    ''' given a year as a string, update the local xml feed for that year, adding
    any episodes to it that are missing (they are missing if they are on the
    website but not on the feed)'''
    info = get_temp_file_info_dict()
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    full_path_to_temp_dir = os.path.join(temp_loc, temp_dir, temp_file)
    url = get_prod_xml_url()
    driver = ds_get_utils.open_driver()
    xml_urls = xml_utils.get_urls_present_in_local_prod_xml_file_for_year(year, full_path_to_temp_dir)
    scotus_urls = ds_get_utils.get_case_urls_from_year_page(year, driver)
    missing_urls = [x for x in scotus_urls if x not in xml_urls]
    for url in missing_urls:
        msg = f"adding {url} to local XML"
        print(msg)
        logging.info(msg)
        case_info_dict = ds_get.create_episode_dict_from_case_url(url, driver)
        xml_utils.insert_episode(case_info_dict, full_path_to_temp_dir)
    ds_get_utils.close_driver(driver)
