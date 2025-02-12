#!/usr/bin/env python3

import os
import sys
import subprocess
import gzip
import shutil
from pathlib import Path
import urllib.request
import urllib.error
from importlib.metadata import version


def get_suffix(os_type, os_arch):
    suffixes = {
        ("win32", "x86_64"): "win-x64.exe.gz",
        ("linux", "x86_64"): "linux-x64.gz",
        ("linux", "aarch64"): "linux-arm64.gz",
        ("darwin", "x86_64"): "macos-x64.gz",
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
    forevervm_version = version("forevervm")
    bindir = (
        Path.home()
        / ".cache"
        / "forevervm"
        / f"{sys.platform}-{os.uname().machine}-{forevervm_version}"
    )
    bindir.mkdir(parents=True, exist_ok=True)

    binpath = bindir / "forevervm"
    if binpath.exists():
        return str(binpath)

    url = binary_url(forevervm_version, sys.platform, os.uname().machine)
    download_file(url, binpath)

    return str(binpath)


def run_binary():
    binpath = get_binary()

    env = os.environ.copy()

    env["FOREVERVM_RUNNER"] = "uvx"
    subprocess.run([binpath] + sys.argv[1:], env=env)


if __name__ == "__main__":
    run_binary()
