import drive_manager
import os

def main():
    print("Connecting to Google Drive...")
    drive_service = drive_manager.authenticate_user()
    
    # --- PHASE 1: FETCH DATA ---
    print("\n--- PHASE 1: DOWNLOADING DATASET ---")
    dataset_videos = drive_manager.download_dataset(drive_service)
    
    # --- PHASE 2: COMPUTE ---
    print("\n--- PHASE 2: AI PROCESSING ---")
    print(f"Your Deep Learning model will now analyze these files: {dataset_videos}")
    
    # --- PHASE 3: UPLOAD ---
    print("\n--- PHASE 3: UPLOADING RESULTS ---")
    
    final_result_file = 'downloads\_FjROQyb1C8.mp4' 
    
    if os.path.exists(final_result_file):
        drive_manager.upload_report(drive_service, final_result_file)
    else:
        print(f"Skipping upload: Could not find '{final_result_file}' on your computer.")

if __name__ == '__main__':
    main()