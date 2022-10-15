import sys
sys.path.append('..')

import os
import github
import datetime
from parser import MyHTMLParser
from xml_utils import utils as xml_utils
from private import secrets
from rasp_updater import updater



def push_local_prod_to_github(info):
    print("Starting push to github")
    temp_dir = info['temp_dir']
    temp_loc = info['temp_loc']
    temp_file = info['temp_file']
    path_to_local_prod_xml_file = os.path.join(temp_loc, temp_dir, temp_file)
    token = secrets.get_token()
    g = github.Github(token)
    repo = g.get_user().get_repo("purplefloyd14.github.io")
    parser = MyHTMLParser()
    parsed_xml = xml_utils.get_parsed_xml_from_local(path_to_local_prod_xml_file, parser)
    environment_file = updater.get_prod_xml_url().split('github.io/')[1]
    file = repo.get_contents(environment_file)
    time_stamp= datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    rel_path = f'./{file.path}'
    repo.update_file(rel_path, f"committing files {time_stamp}", parsed_xml, file.sha, branch="main")
    print("github push complete")
