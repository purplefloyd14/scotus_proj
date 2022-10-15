from datetime import datetime
import time
import sys
sys.path.append('..')
from xml_utils import utils as xml_utils
from data_scrape import get as ds_get
from data_scrape import get_utils as ds_get_utils
import os
import shutil

seed_feed = '../rss_streams/seed_feed.xml'
channel_template = '../rss_streams/channel_template.xml'
prod_feed = '../rss_streams/prod_feed.xml'

def generate_channel_from_seed():
    xml_utils.add_channel(seed_feed, output=channel_template)
    shutil.copyfile(channel_template, prod_feed)
    return

def populate_channel_with_episodes_thru_year(end_year):
    #not used 
    driver = ds_get_utils.open_driver()
    year = 2010
    while year < end_year:
        print(f"Generating data for year {year}")
        year_dict = ds_get.handle_year_for_data_scrape(year, driver)
        for case_dict in year_dict.values():
            print(f"writing xml for case {case_dict['case_name']}")
            xml_utils.insert_episode(case_dict, prod_feed)
        year+=1
    ds_get_utils.close_driver(driver)
    print('Done.')
    return
