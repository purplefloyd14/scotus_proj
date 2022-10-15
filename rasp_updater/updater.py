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

def get_prod_xml_url():
    return 'https://purplefloyd14.github.io/dev.xml'

def get_temp_file_info_dict():
    info = {}
    info['temp_dir'] = 'temp'
    info['temp_loc'] = os.getcwd()
    info['temp_file'] = 'temp.xml'
    return info

def update_needed_bool():
    #do we need to do an update
    prod_xml_url = get_prod_xml_url()
    driver = ds_get_utils.open_driver()
    driver.delete_all_cookies()
    number_of_items_on_scotus_site = ds_get_utils.count_cases_on_scotus_site(driver)
    number_of_items_on_prod_xml_feed = xml_utils.count_items_on_prod_feed(prod_xml_url)
    ds_get_utils.close_driver(driver)
    time_stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    if number_of_items_on_scotus_site == number_of_items_on_prod_xml_feed:
        print(f"{time_stamp} | we're good - no update needed")
        return False #no update needed
    elif number_of_items_on_scotus_site > number_of_items_on_prod_xml_feed:
        diff = number_of_items_on_scotus_site - number_of_items_on_prod_xml_feed
        print(f"{time_stamp} | we need to update. XML is missing {diff} items")
        return True #update needed


def update():
    print("Starting Update Process..")
    we_need_to_update = update_needed_bool()
    if we_need_to_update:
        save_file_to_local()
        add_new_episodes_to_local_prod_xml(new_first=True)
        info = get_temp_file_info_dict()
        push_utils.push_local_prod_to_github(info)


def att():
    info = get_temp_file_info_dict()
    push_utils.push_local_prod_to_github(info)


def populate():
    #should only be run when there is a new (unpopulated template)
    #if running this, template should be @ dev.xml, so point URL there
    we_need_to_update = update_needed_bool()
    if we_need_to_update:
        save_file_to_local()
        add_new_episodes_to_local_prod_xml(new_first=False)
        info = get_temp_file_info_dict()
        push_utils.push_local_prod_to_github(info)


def add_new_episodes_to_local_prod_xml(new_first):
    driver = ds_get_utils.open_driver()
    url = get_prod_xml_url()
    years_arr = sorted(ds_get_utils.get_list_of_available_years(driver))
    if new_first:
        #work from newest recent to oldest
        years_arr = sorted(years_arr, reverse=True)
    info = get_temp_file_info_dict()
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    full_path_to_temp_dir = os.path.join(temp_loc, temp_dir, temp_file)
    for year in years_arr:
        urls_on_site = ds_get_utils.get_case_urls_from_year_page(year, driver)
        urls_on_local_prod_xml_feed = xml_utils.get_urls_present_in_local_prod_xml_file_for_year(year, full_path_to_temp_dir)
        if len(urls_on_site) == len(urls_on_local_prod_xml_feed):
            continue
        elif len(urls_on_site) > len(urls_on_local_prod_xml_feed):
            print(f"making updates for {year}")
            add_new_elements(year)
    print('updates complete')
    ds_get_utils.close_driver(driver)

def save_file_to_local():
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
        print(f"adding {url}")
        case_info_dict = ds_get.create_episode_dict_from_case_url(url, driver)
        xml_utils.insert_episode(case_info_dict, full_path_to_temp_dir)
    print("done")
    ds_get_utils.close_driver(driver)

def upload_file_to_github():
    return

def remove_temp_directory_and_contents():
    return
