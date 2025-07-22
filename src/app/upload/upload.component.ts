import { Component, OnInit } from '@angular/core';
import { UploadService } from './upload.service';

interface UploadStatus {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
})
export class UploadComponent implements OnInit {
  files: File[] = [];
  uploadStatuses: UploadStatus[] = [];
  activeUploads: string[] = [];

  constructor(private uploadService: UploadService) { }

  ngOnInit() {
    this.activeUploads = this.uploadService.getActiveUploads();
    this.activeUploads.forEach(fileId => {
      const file = this.uploadService.getFileByFileId(fileId);
      if (file) {
        this.uploadStatuses.push({
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'uploading'
        });
      }
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.files = Array.from(input.files);

      // Initialize statuses
      this.files.forEach(file => {
        this.uploadStatuses.push({
          fileId: '', // Will be set when upload starts
          fileName: file.name,
          progress: 0,
          status: 'pending'
        });
      });
    }
  }

  startUpload() {
    this.files.forEach(file => {
      const statusIndex = this.uploadStatuses.findIndex(s => s.fileName === file.name && s.status === 'pending');
      if (statusIndex === -1) return;

      const upload = this.uploadService.uploadFile(file);

      // Update status with fileId
      this.uploadStatuses[statusIndex].fileId = upload.fileId;
      this.uploadStatuses[statusIndex].status = 'uploading';

      // Track upload
      this.activeUploads.push(upload.fileId);

      // Subscribe to progress
      upload.progress.subscribe(progress => {
        const status = this.uploadStatuses.find(s => s.fileId === upload.fileId);
        if (status) {
          status.progress = progress;
        }
      });

      // Handle completion
      upload.complete.subscribe(() => {
        const status = this.uploadStatuses.find(s => s.fileId === upload.fileId);
        if (status) {
          status.status = 'completed';
        }
        this.activeUploads = this.activeUploads.filter(id => id !== upload.fileId);
      });

      // Handle errors
      upload.error.subscribe(error => {
        const status = this.uploadStatuses.find(s => s.fileId === upload.fileId);
        if (status) {
          status.status = 'failed';
          status.error = error.message || 'Upload failed';
        }
        this.activeUploads = this.activeUploads.filter(id => id !== upload.fileId);
      });
      upload.disconnect.subscribe(error =>{
        console.log(" disconnected" ,error);
        
      })
    });
  }

  get completedFiles() {
    return this.uploadStatuses.filter(status => status.status === 'completed');
  }

  get failedFiles() {
    return this.uploadStatuses.filter(status => status.status === 'failed');
  }

  get inProgressFiles() {
    return this.uploadStatuses.filter(status =>
      status.status === 'uploading' || status.status === 'pending'
    );
  }
  getFileSize(fileName: string): number {

    const file = this.files.find(f => f.name === fileName);
    return file ? file.size : 0;
  }
}