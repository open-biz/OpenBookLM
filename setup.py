from setuptools import setup, find_packages

setup(
    name="openbooklm",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "python-multipart",
        "uvicorn",
        "PyPDF2",
        "python-dotenv",
        "llamaapi",
        "tiktoken",
    ],
) 