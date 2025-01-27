#!/usr/bin/env python3

import os
import sys
import re
import shutil
import requests
import argparse
from collections import OrderedDict

"""
update requirements.txt with latest versions from pypi
Run:
(venv) ./scripts/gen_latest_reqs.py [--debug]
"""

# assumes this file is one folder depth level deeper than project root 
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(ROOT)
reqs_file = os.path.join(ROOT, "requirements.txt")

def parse_args() -> argparse.Namespace:
    """ enter --debug to print debug messages instead of writing to file """
    parser = argparse.ArgumentParser(description="Update requirements.txt with latest versions")
    parser.add_argument("--debug", action="store_true")
    # parser.add_argument("--help", action="store_true")
    args = parser.parse_args()
    if args.debug:
        for arg in vars(args):
            print(f"{arg = }\n")
    return args


def convert_reqs_file_to_dict(debug=False) -> dict:
    """
    update requirements.txt with latest versions from pypi
    
    possible line formats:
    1) module>=version or module==version
    2) module
    3) # comment or blank line or other
    
    we keep the >= logic if found and query pypi for latest version
    if version not specified, we query pypi for it and use >= logic
    on special lines we keep them as is and write them to the output file
    """
    if not os.path.isfile(reqs_file):
        print(f"requirements file not found.\n{reqs_file = }\nExiting...")
        sys.exit(1)
    
    # module : []== or >=, version]
    package_dict = OrderedDict()
    with open(reqs_file, 'r') as f:
        count = 0
        for line in f:
            # Remove trailing whitespace but preserve newline
            line = line.rstrip('\n')

            logic, version = None, None
            # blank lines, comment lines
            if re.search("^$", line) or re.search("^#", line):
                line_out = f"{line}\n"
                package_dict[str(count)] = ['write', line_out]

            # module==version or module>=version
            # transformers>=4.48.0 or transformers==4.48.0
            elif re.search(r'[>=]{1}=', line):
                result = re.match(r'^([a-zA-Z0-9_-]+)([>=]{1}=)([0-9.]+)$', line)
                if result:
                    module = result.group(1)
                    logic = result.group(2)
                    version = result.group(3)
                    if debug:
                        print(f"{module = }\n{logic = }\n{version = }\n")
                    package_dict[module] = [logic, version]

            # module only / other
            elif re.search(r'^([a-zA-Z0-9_-]+)$', line):
                result = re.match(r'^([a-zA-Z0-9_-]+)$', line)
                if result:
                    module = result.group(1)
                    package_dict[module] = [logic, version]

            # edge case (shouldn't occur in properly formed requirements.txt file)
            else:
                line_out = f"{line}\n"
                package_dict[str(count)] = ['write', line_out]

            count += 1

    if debug:
        for module, logic_version in package_dict.items():
            logic = logic_version[0]
            version = logic_version[1]
            print(f"{module = }\n{logic = }\n{version = }\n")

    return package_dict


def get_latest_versions_and_update_reqs(package_dict: dict, debug=False) -> None:
    """
    pypi request to check for latest version
    """
    # pypi api endpoint
    url_pypi = "https://pypi.org/pypi/"
    
    output_reqs_file = os.path.join(ROOT, "requirements.txt")
    backup_reqs_file = os.path.join(ROOT, "old.requirements.txt")

    # rename old reqs file
    if not debug:
        shutil.move(output_reqs_file, backup_reqs_file)

    mode = 'r' if debug else 'w'
    with open(output_reqs_file, mode) as f:
        for module, logic_version in package_dict.items():

            logic = logic_version[0]
            version = logic_version[1]

            # for special case lines like blank line or comment line, write as is
            if logic == 'write':
                print(version) if debug else f.write(version)
                continue

            logic = logic_version[0]
            version = logic_version[1]

            # Get package info from PyPI JSON API
            pypi_mod_url = f"{url_pypi}{module}/json"
            try:
                r = requests.get(pypi_mod_url, timeout=5)
                r.raise_for_status()  # Raise an error for bad status codes
                
                # Get latest version from JSON response
                if r.status_code == 200:
                    latest_version = r.json()['info']['version']
                    logic_gte = ">="
                    line_out = f"{module}{logic_gte}{latest_version}\n"

                    if debug:
                        print(f"Found latest version for {module}: {latest_version}")
                        print(line_out)
                    else:
                        f.write(line_out)
                else:
                    if version is None:
                        line_out = f"{module}\n"
                        print(f"Using module without version: {module}") if debug else f.write(line_out)

                    else:
                        line_out = f"{module}{logic}{version}\n"
                        print(f"Using existing version for {module}: {version}") if debug else f.write(line_out)

            except Exception as e:
                if debug:
                    print(f"Error checking {module}: {str(e)}")
                # Fall back to existing version if available
                if logic is None:
                    line_out = f"{module}\n"
                    f.write(line_out)
                else:
                    line_out = f"{module}{logic}{version}\n"
                    f.write(line_out)


if __name__ == "__main__":

    args = parse_args()
    debug = args.debug

    packages_dict = convert_reqs_file_to_dict(debug)

    get_latest_versions_and_update_reqs(packages_dict, debug)
