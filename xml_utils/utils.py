import xml.etree.ElementTree as ET
from xml.dom import minidom
import datetime
import os
import requests
from bs4 import BeautifulSoup
import time

#pub date must be expressed in the following mannor:
#Tue, 30 Nov 2004 13:43:02 CST

def add_channel(seed, output):
    namespaces = dict([node for _, node in ET.iterparse(seed, events=['start-ns'])])
    tree = ET.parse(seed)
    root = tree.getroot()
    add_ns(root, namespaces)
    channel = generate_xml_for_channel()
    root.append(channel)
    ET.indent(tree, '  ')
    tree.write(output, xml_declaration=True, encoding="UTF-8")

def add_ns(root, ns):
    for name in ns:
        full_name = f'xmlns:{name}'
        root.set(full_name, ns[name])
        root.set(full_name, ns[name])

def save_xml_file_to_local(url, full_path_to_dir, parser):
    """
    get xml from internet and save at local location
    """
    document = requests.get(url)
    soup= BeautifulSoup(document.content,"lxml-xml")
    el = soup.find('rss')
    el.attrs['xmlns:content'] = "http://purl.org/rss/1.0/modules/content/"
    el.attrs['xmlns:itunes'] = "http://www.itunes.com/dtds/podcast-1.0.dtd"
    f = open(full_path_to_dir, "w")
    parser.feed('<?xml version="1.0" encoding="UTF-8"?> \n' + str(soup))
    parsed_string = parser.get_parsed_string()
    f.write(parsed_string)
    f.close()

def get_parsed_xml_from_local(full_path_to_dir, parser):
    """
    return parsed xml from local
    """
    f = open(full_path_to_dir, "r")
    parser.feed('<?xml version="1.0" encoding="UTF-8"?> \n' + str(f.read()))
    parsed_string = parser.get_parsed_string()
    return parsed_string


def get_urls_present_in_local_prod_xml_file_for_year(year, path):
    year = str(year)
    soup = BeautifulSoup(open(path, encoding='utf-8'), 'lxml-xml')
    episode_arr = soup.find_all("itunes:season", text=year)
    link_arr = []
    for epi in episode_arr:
        par = epi.findParent()
        link = par.link.text
        year_in_link = link.split('audio/')[1][:4] #first 4 digits of the second half of link split on 'audio/'
        if par.name == 'item' and year_in_link==year:
            link_arr.append(par.link.text)
    return link_arr

def count_items_on_prod_feed(prod_xml_url):
    document = requests.get(prod_xml_url)
    soup= BeautifulSoup(document.content,"lxml-xml")
    episode_arr = soup.find_all("item")
    checked_arr = []
    for epi in episode_arr:
        if 'audio/mpeg' == epi.enclosure.get('type'):
            checked_arr.append(epi)
    return len(checked_arr)


def stub_episode_dict():
    episode_dict={}
    now = datetime.datetime.now()
    episode_dict['case_name'] = 'new one v brother'
    episode_dict['case_detail_url'] = 'aol.com'
    episode_dict['case_date'] = '1234'
    episode_dict['docket_number'] = 'docket1'
    episode_dict['media_url'] = '123.com'
    episode_dict['length_bytes'] = '5'
    episode_dict['guid'] = '56'
    episode_dict['pub_date'] = f'{now.minute}, {now.second}'
    episode_dict['year'] = '2018'
    return episode_dict

def insert_episode(episode_dict, feed):
    # episode_dict = stub_episode_dict()
    episode_xml_item = generate_xml_for_episode(episode_dict)
    register_all_namespaces(feed)
    tree = ET.parse(feed,ET.XMLParser(encoding='utf-8'))
    root = tree.getroot()
    channel = root.find('channel')
    entry_index = determine_entry_index(root, channel)
    channel.insert(entry_index, episode_xml_item)
    ET.indent(tree, '  ')
    tree.write(feed, xml_declaration=True, encoding="UTF-8")
    time.sleep(1)
    return

def determine_entry_index(root, channel):
    index_of_first_item = get_index(channel, 'item')
    if index_of_first_item:
        return index_of_first_item
    else:
        tag_names = {t.tag for t in root.findall('.//channel/*')}
        return len(tag_names) + 3


def get_index(parent, elem_tag='item'):
    count = 0
    for el in parent:
        if el.tag ==elem_tag:
            return count
        count += 1
    return False


def register_all_namespaces(filename):
    namespaces = dict([node for _, node in ET.iterparse(filename, events=['start-ns'])])
    for ns in namespaces:
        ET.register_namespace(ns, namespaces[ns])


def generate_xml_for_episode(episode_dict):
    '''
    episode_dict['case_name'] = case_name
    episode_dict['case_detail_url'] = case_detail_url
    episode_dict['case_date'] = date_in_site_format
    episode_dict['docket_number'] = docket_number
    episode_dict['media_url'] = case_media_url
    episode_dict['guid'] = 'docket_number
    episode_dict['pub_date'] = pub_date
    episode_dict['year'] = year
    episode_dict['size_bytes'] = size_in_bytes
    '''
    case_name=episode_dict['case_name']
    case_detail_url=episode_dict['case_detail_url']
    case_date=episode_dict['case_date']
    docket_number=episode_dict['docket_number']
    media_url=episode_dict['media_url']
    size_bytes=episode_dict['size_bytes']
    guid_id=episode_dict['guid']
    pub_date_info =episode_dict['pub_date']
    year = episode_dict['year']

    item = ET.Element('item')

    episode_type = ET.SubElement(item, 'itunes:episodeType')
    episode_type.text = 'full'

    title = ET.SubElement(item, 'title')
    title.text = case_name

    description = ET.SubElement(item, 'description')
    description.text = f'{case_name} | {case_date} | Docket #: {docket_number}'

    enclosure = ET.SubElement(item, 'enclosure')
    enclosure.set('url', media_url)
    enclosure.set('length', size_bytes)
    enclosure.set('type', 'audio/mpeg')

    guid = ET.SubElement(item, 'guid')
    guid.set('isPermaLink', "False")
    guid.text = guid_id

    pub_date = ET.SubElement(item, 'pubDate')
    pub_date.text = pub_date_info

    link = ET.SubElement(item, 'link')
    link.text = case_detail_url

    explicit = ET.SubElement(item, 'itunes:explicit')
    explicit.text = 'false'

    season = ET.SubElement(item, 'itunes:season')
    season.text = str(year)

    return item


def generate_xml_for_channel():
    channel = ET.Element('channel')

    title = ET.SubElement(channel, 'title')
    title.text = 'The Supreme Court: Oral Arguments'

    description = ET.SubElement(channel, 'description')
    description.text = "A public good: every Supreme Court Oral Argument since 2010. Making the Highest Court more accessible for a modern audience. If you'd like to support the law student who created this project instead of studying you can do so here: https://www.patreon.com/purplefloyd"

    image = ET.SubElement(channel, 'itunes:image')
    image.set('href', 'https://courtartist.com/wp-content/uploads/bSC220425wide_Clement.jpg')

    language = ET.SubElement(channel, 'language')
    language.text = 'en-us'

    category = ET.SubElement(channel, 'itunes:category')
    category.text = "Society &amp; Culture"

    category = ET.SubElement(channel, 'itunes:category')
    category.text = "History"

    category = ET.SubElement(channel, 'itunes:category')
    category.text = "Government"

    category = ET.SubElement(channel, 'itunes:category')
    category.text = "Education"

    explicit = ET.SubElement(channel, 'itunes:explicit')
    explicit.text = 'false'

    author = ET.SubElement(channel, 'itunes:author')
    author.text = 'Brad Neal'

    link = ET.SubElement(channel, 'link')
    link.text = 'https://purplefloyd14.github.io/index.html'

    owner = ET.SubElement(channel, 'itunes:owner')
    owner_email = ET.SubElement(owner, 'itunes:email')
    owner_email.text = 'scotus.oral.args.podcast@gmail.com'
    owner_name = ET.SubElement(owner, 'itunes:name')
    owner_name.text = 'Brad Neal'

    show_type = ET.SubElement(channel, 'itunes:type')
    show_type.text = 'episodic'

    copyright = ET.SubElement(channel, 'copyright')
    copyright.text = 'Unprotected Under 17 U.S. Code § 105'


    return channel
