import sys
sys.path.append('..')

import os
import github
import datetime
from parser import MyHTMLParser
from xml_utils import utils as xml_utils
from private import secrets
from rasp_updater import updater
import datetime
import logging



def push_local_prod_to_github(info):
    time_stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    msg = f"Starting push to github"
    logging.info(msg)
    print(msg)
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    path_to_local_prod_xml_file = os.path.join(temp_loc, temp_dir, temp_file)
    token = secrets.get_token()
    g = github.Github(token)
    repo = g.get_user().get_repo("purplefloyd14.github.io")
    parser = MyHTMLParser()
    parsed_xml = xml_utils.get_parsed_xml_from_local(path_to_local_prod_xml_file, parser)
    prod_xml_url = updater.get_prod_xml_url()
    environment_file = prod_xml_url.split('github.io/')[1]
    msg2 = f'Pushing local xml to: {prod_xml_url}'
    print(msg2)
    logging.info(msg2)
    file = repo.get_contents(environment_file)
    rel_path = f'./{file.path}'
    repo.update_file(rel_path, f"Updated XML on: {time_stamp}", parsed_xml, file.sha, branch="main")
    info = f"{time_stamp} | github push complete"
    print(info)
    logging.info(info)
