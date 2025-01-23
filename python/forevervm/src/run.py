#!/usr/bin/env python3

import os
import sys
import subprocess
import gzip
import shutil
from pathlib import Path
import urllib.request
import urllib.error


def get_suffix(os_type, os_arch):
    suffixes = {
        ("win32", "x64"): "win-x64.exe.gz",
        ("linux", "x64"): "linux-x64.gz",
        ("linux", "arm64"): "linux-arm64.gz",
        ("darwin", "x64"): "macos-x64.gz",
        ("darwin", "arm64"): "macos-arm64.gz",
    }

    if (os_type, os_arch) not in suffixes:
        raise RuntimeError(f"Unsupported platform: {os_type} {os_arch}")
    return suffixes[(os_type, os_arch)]


def binary_url(version, os_type, os_arch):
    suffix = get_suffix(os_type, os_arch)
    return f"https://github.com/jamsocket/forevervm/releases/download/v{version}/forevervm-{suffix}"


def download_file(url, file_path):
    try:
        response = urllib.request.urlopen(url)
        if response.status == 404:
            raise RuntimeError(f"File not found at {url}. It may have been removed.")

        with gzip.open(response) as gz, open(file_path, "wb") as f:
            shutil.copyfileobj(gz, f)

        os.chmod(file_path, 0o770)
        return file_path

    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Error downloading {url}: server returned {e.code}")


def get_binary():
    bindir = Path.home() / ".config" / "forevervm"
    bindir.mkdir(parents=True, exist_ok=True)

    binpath = bindir / "forevervm"
    if binpath.exists():
        return str(binpath)

    version = ""
    pyproject = Path(__file__).parent.parent / "pyproject.toml"
    with open(pyproject) as f:
        for line in f:
            if line.startswith("version"):
                version = line.split("=")[1].strip().strip('"')
                break

    if not version:
        raise RuntimeError("No version found in pyproject.toml")

    url = binary_url(version, sys.platform, os.uname().machine)
    download_file(url, binpath)

    return str(binpath)


def run():
    binpath = get_binary()
    subprocess.run([binpath] + sys.argv[1:])
