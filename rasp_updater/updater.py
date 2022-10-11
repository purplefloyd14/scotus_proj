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


def get_prod_xml_url():
    return 'https://purplefloyd14.github.io/third.xml'

def get_temp_file_info_dict():
    info = {}
    info['temp_dir'] = 'temp'
    info['temp_loc'] = os.getcwd()
    info['temp_file'] = 'temp.xml'
    return info


def save_file_to_local():
    info = get_temp_file_info_dict()
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    parser = MyHTMLParser()
    full_path_to_temp_dir = os.path.join(temp_loc, temp_dir, temp_file)
    url=get_prod_xml_url()
    ds_get_utils.create_folder(temp_dir, temp_loc)
    xml_utils.save_file_to_local(url, full_path_to_temp_dir, parser)


def add_new_elements(year):
    info = get_temp_file_info_dict()
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    full_path_to_temp_dir = os.path.join(temp_loc, temp_dir, temp_file)
    url = get_prod_xml_url()
    driver = ds_get_utils.open_driver()
    xml_urls = xml_utils.get_urls_present_in_file_for_year(year, url, full_path_to_temp_dir)
    scotus_urls = ds_get_utils.get_case_urls_from_year_page(year, driver)
    missing_urls = [x for x in scotus_urls if x not in xml_urls]
    for url in missing_urls:
        print(f"adding {url}")
        case_info_dict = ds_get.create_episode_dict_from_case_url(url, driver)
        xml_utils.insert_episode(case_info_dict, full_path_to_temp_dir)
    print("done")

def upload_file_to_github():
    return

def remove_temp_directory_and_contents():
    return
