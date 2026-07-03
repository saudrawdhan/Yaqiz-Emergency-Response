import io
import os
import mimetypes
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload

# pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
# ^^^ install the official Google Cloud Python packages ^^^

SCOPES = ['https://www.googleapis.com/auth/drive']

# --- YOUR PROJECT IDs ---
DATASET_FOLDER_ID = '1Ex1Z8SG8qC3SueDllZslH_wC69Sfy2N1'  # Updated to new camera videos folder
REPORTS_FOLDER_ID = '1P_Ogn8pEyyKPFJZ5nXTU3vYnPM6O9iEB'

def authenticate_user():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return build('drive', 'v3', credentials=creds)

def list_files_in_folder(service, folder_id):
    query = f"'{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    return results.get('files', [])

def download_media(service, file_id, download_path):
    request = service.files().get_media(fileId=file_id)
    with io.FileIO(download_path, 'wb') as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()

def upload_media(service, file_path, file_name, mime_type, target_folder_id):
    file_metadata = {'name': file_name, 'parents': [target_folder_id]}
    media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
    return file.get('id')

# --- THE TEAM WORKFLOW FUNCTIONS ---
def download_dataset(service, local_download_folder="downloads"):
    print("Scanning Dataset folder...")
    dataset_files = list_files_in_folder(service, DATASET_FOLDER_ID)
    
    if not dataset_files:
        print("The Dataset folder is empty!")
        return []

    print(f"Found {len(dataset_files)} files! Starting batch download...\n")
    downloaded_files = []

    # --- Create the local 'downloads' folder if it doesn't exist ---
    if not os.path.exists(local_download_folder):
        os.makedirs(local_download_folder)
        print(f"Created local folder: '{local_download_folder}'")

    for file in dataset_files:
        file_id = file['id']
        file_name = file['name']
        
        # --- Tell Python exactly where to save the file ---
        # This combines "downloads" and "video.mp4" into "downloads/video.mp4"
        local_file_path = os.path.join(local_download_folder, file_name)
        
        if not os.path.exists(local_file_path):
            print(f"Downloading: {file_name} into {local_download_folder}/...")
            download_media(service, file_id, local_file_path)
        else:
            print(f"Already have: {file_name} inside {local_download_folder}/")
            
        # Add the FULL path to the list so your AI knows exactly where it is
        downloaded_files.append(local_file_path)
        
    print(f"\nSUCCESS: All dataset videos are ready in your '{local_download_folder}' folder!")
    return downloaded_files

def upload_report(service, local_file_path):
    file_name = os.path.basename(local_file_path)
    print(f"Checking if '{file_name}' already exists in Reports...")
    
    # --- 1. THE ANTI-DUPLICATE CHECK ---
    # Ask Google Drive if this exact file name already exists in the folder
    query = f"'{REPORTS_FOLDER_ID}' in parents and name='{file_name}' and trashed=false"
    results = service.files().list(q=query, fields="files(id, name)").execute()
    existing_files = results.get('files', [])
    
    # If the list has anything in it, the file already exists!
    if len(existing_files) > 0:
        existing_id = existing_files[0]['id']
        print(f"Skipping upload: '{file_name}' already exists on Drive!")
        return existing_id

    # --- 2. THE UPLOAD ---
    print(f"Uploading '{file_name}' to Reports folder...")
    mime_type, _ = mimetypes.guess_type(local_file_path)
    if mime_type is None:
        mime_type = 'application/octet-stream'
        
    file_id = upload_media(service, local_file_path, file_name, mime_type, REPORTS_FOLDER_ID)
    print(f"SUCCESS! Uploaded to Reports with ID: {file_id}")
    return file_id