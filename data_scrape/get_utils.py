from selenium import webdriver
from datetime import datetime
from selenium.webdriver.chrome.options import Options
import re
import urllib.request
from mutagen.mp3 import MP3
import os
import ffmpeg
import time
from email import utils as email_utils
from random import randint
import shutil
from selenium.webdriver.common.by import By
import requests


def open_driver():
    options = Options()
    options.add_argument("--headless")
    driver = webdriver.Chrome(chrome_options=options)
    return driver

def close_driver(driver):
    driver.close()

def get_case_urls_from_year_page(year, driver):
    '''takes a year value and returns an array of
    urls for CASE PAGES from that year. Each url goes to a case page
    year can be a string or an int'''
    year = str(year)
    year_page = driver.get(f'https://www.supremecourt.gov/oral_arguments/argument_audio/{year}')
    elem = driver.find_element("xpath", "//*[contains(@class, 'openall')]")
    elem.click()
    elems = driver.find_elements("xpath", f"//*[contains(@href, '../audio/{year}')]")
    output = []
    for elem in elems:
        output.append(elem.get_attribute('href'))
    return output


def get_year_from_url(url):
    split_url = url.split('audio/')
    date_str = split_url[1][:4]
    return date_str

def get_pub_date(date):
    split_date = date.split('/')
    month = int(split_date[0])
    day = int(split_date[1])
    year = int('20' + split_date[2])
    now = datetime.now()
    hour = now.hour
    minute = now.minute
    seconds = now.second
    dt = datetime(year=year, month=month, day=day, hour=hour, minute=minute, second=seconds)
    tup = dt.timetuple()
    stamp=time.mktime(tup)
    output = email_utils.formatdate(stamp)
    return output

def get_size_in_bytes(url):
     r = requests.head(url)
     return r.headers['Content-Length']

def get_date(url, driver):
    elem = driver.find_element("xpath", "//*[contains(@id, 'lblDate')]")
    date = elem.text
    return date
    #given a url it gets the date of the case

def get_docket(url, driver):
    elem = driver.find_element("xpath", "//*[contains(@id, 'lblDocket')]")
    case_number = elem.text
    return case_number

def get_name(url, driver):
    elem = driver.find_element("xpath", "//*[contains(@id, 'lblCaseName')]")
    case_name = elem.text
    return case_name.replace('/','')
    #given a url it gets the name of the case, removes slashes

def get_audio_link(url, driver):
    '''given a CASE PAGE url, returns the download link for that case'''
    elem = driver.find_element("xpath", "//*[contains(@type, 'audio/mp3')]")
    download_url = elem.get_attribute('src')
    return download_url
    #returns 'https://www.supremecourt.gov/media/audio/mp3files/15-420.mp3'

def count_cases_on_scotus_site(driver):
    years_arr = get_list_of_available_years(driver)
    url_dict_by_year = get_scotus_site_url_dict(years_arr, driver)
    return count_urls_from_year_dict(url_dict_by_year)

def get_scotus_site_url_dict(years_arr, driver):
    url_dict_by_year = {}
    for year in years_arr:
        year = str(year)
        urls_for_year_arr = get_case_urls_from_year_page(year, driver)
        url_dict_by_year[year] = urls_for_year_arr
    return url_dict_by_year

def count_urls_from_year_dict(year_dict):
    urls_count = 0
    for year in year_dict.keys():
        urls_count += len(year_dict[year])
    return urls_count


def get_list_of_available_years(driver):
    driver.get('https://www.supremecourt.gov/oral_arguments/argument_audio.aspx')
    elems = driver.find_elements("xpath", "//*[contains(@id, 'ctl00_ctl00_MainEditable_mainContent_Repeater1_ctl')]")
    years_arr = []
    for el in elems:
        if len(el.text) == 4:
            years_arr.append(el.text)
    return years_arr

#below here are save utils, no longer needed as of now but may be useful one day:

def create_folder(name, location):
    '''creates dir with [name] inside dir at [location]
    name can be string or int
    location must be string
    location is an abs path
    '''
    name = str(name)
    path_and_dir=os.path.join(location, name)
    if not os.path.exists(path_and_dir):
        os.mkdir(path_and_dir)

def create_discription_file(date, docket, case_name, location):
    text_file = open(f'{location}/{case_name}.txt',"w+")
    content = f'Oral Argument: {case_name}\nArgued: {date}\nDocket Number: {docket}\n\n---\n\nSupport the law student behind this project: https://www.patreon.com/purplefloyd'
    text_file.write(content)
    text_file.close()


def download_media_from_link(link, title, location):
    '''takes a download link url, a title, and a dir location for saving
    saves the url's file in the dir under the title given'''
    title_w_ext = title + '.mp3'
    final_directory = os.path.join(location, title_w_ext)
    urllib.request.urlretrieve(link, final_directory)
    return




# def check():
#     '''test functon for get case urls'''
#     year = 2010
#     while year<2013:
#         get_case_urls_from_year_page(year)
#         print('------------------------------------------------')
#         print('------------------------------------------------')
#         print('------------------------------------------------')
#         year+=1
#     return
