from data_scrape.get_utils import *
import sys
import os


def create_episode_dict_from_case_url(url, driver):
    episode_dict = {}
    driver.get(url)
    date_in_site_format = get_date(url, driver)
    docket_number = get_docket(url, driver)
    case_name = get_name(url, driver)
    case_detail_url = url
    case_media_url = get_audio_link(url, driver)
    pub_date = get_pub_date(date_in_site_format)
    year = get_year_from_url(url)
    size_in_bytes = get_size_in_bytes(url)

    episode_dict['case_name'] = case_name
    episode_dict['case_detail_url'] = case_detail_url
    episode_dict['case_date'] = date_in_site_format
    episode_dict['docket_number'] = docket_number
    episode_dict['media_url'] = case_media_url
    episode_dict['guid'] = docket_number
    episode_dict['pub_date'] = pub_date
    episode_dict['year'] = year
    episode_dict['size_bytes'] = size_in_bytes

    return episode_dict

def handle_year_for_data_scrape(year, driver):
    year = str(year)
    year_info_dict = {}
    # case_page_urls = get_case_urls_from_year_page(year, driver)
    case_page_urls = ['https://www.supremecourt.gov/oral_arguments/audio/2011/10-844',
    'https://www.supremecourt.gov/oral_arguments/audio/2011/11-398-Monday']
    for case_url in case_page_urls:
        case_dict = create_episode_dict_from_case_url(case_url, driver)
        print(f"generating data for {case_dict['case_name']}")
        year_info_dict[case_dict['case_name']] = case_dict
    return year_info_dict




#below here are utils for saving, which is no longer relevant but may again be someday




def populate_backlog(base_location='.'):
    '''
    this backfills every case from 2010 until today
    it creates a folder for each year
    in that folders are other folders with the case name
    in each case name folder we have the mp3 and a txt file with case name
    docket number and date as csv
    default location is current dir
    '''
    media_directory_name = 'scotus_media'
    create_folder(media_directory_name, base_location)
    media_directory = os.path.join(base_location, media_directory_name)
    year = 2015
    while year < 2023:
        handle_year(year, media_directory)
        year += 1
    print('done')
    driver.close()
    return



def handle_year_for_save(year, media_directory_location):
    year = str(year)
    create_folder(year, media_directory_location)
    year_directory_location = os.path.join(media_directory_location, year)
    case_page_urls = get_case_urls_from_year_page(year)
    # case_page_urls = ['https://www.supremecourt.gov/oral_arguments/audio/2011/10-844',
    # 'https://www.supremecourt.gov/oral_arguments/audio/2011/11-398-Monday']
    for url in case_page_urls:
        print(f'Processing: {url}')
        driver.get(url)
        date = get_date(url)
        docket = get_docket(url)
        case_name = get_name(url)
        download_link = get_audio_link(url)
        create_folder(case_name, year_directory_location)
        case_directory_location = os.path.join(year_directory_location, case_name)
        create_discription_file(date, docket, case_name, case_directory_location)
        download_media_from_link(download_link, case_name, case_directory_location)
