import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private socket: Socket;
  private chunkSize = 1024 * 256; // 256KB chunks
  public activeUploads = new Map<string, { file: File, position: number }>();

  constructor() {
// In upload.service.ts

    this.socket = io('http://localhost:3000', {
      reconnection: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });
  }

  uploadFile(file: File) {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.activeUploads.set(fileId, { file, position: 0 });
    
    this.socket.emit('startUpload', {
      fileId,
      fileName: file.name,
      fileSize: file.size
    });
    
    const progressSubject = new Subject<number>();
    const completeSubject = new Subject<void>();
    const disconnectSubject = new Subject<any>();
    
    const errorSubject = new Subject<{message: string, fileId: string}>();

    // Handle server responses
    this.socket.on('ready', (data: { fileId: string }) => {
      if (data.fileId === fileId) {
        this.sendNextChunk(fileId);
      }
    });
    
    this.socket.on('progress', (data: { fileId: string, progress: number }) => {
      if (data.fileId === fileId) {
        progressSubject.next(data.progress);
      }
    });
    
    this.socket.on('complete', (data: { fileId: string }) => {
      if (data.fileId === fileId) {
        this.activeUploads.delete(fileId);
        completeSubject.next();
        completeSubject.complete();
      }
    });

    this.socket.on('disconnect', (a) => {
      disconnectSubject.next(a);
      disconnectSubject.complete();
    });

    this.socket.on('error', (data: { fileId: string, message: string }) => {
      console.log(data);
      
      if (data.fileId === fileId) {
        errorSubject.next({message: data.message, fileId});
        this.activeUploads.delete(fileId);
      }
    });
    
    return {
      progress: progressSubject.asObservable(),
      complete: completeSubject.asObservable(),
      error: errorSubject.asObservable(),
      disconnect:disconnectSubject.asObservable(),
      fileId
    };
  }

  private sendNextChunk(fileId: string) {
    const upload = this.activeUploads.get(fileId);
    if (!upload) return;

    const { file, position } = upload;
    const chunk = file.slice(position, position + this.chunkSize);
    const reader = new FileReader();
    
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const uintArray = new Uint8Array(arrayBuffer);
      
      this.socket.emit('chunk', {
        fileId,
        chunk: Array.from(uintArray),
        position
      });
      
      // Update position
      const newPosition = position + uintArray.length;
      this.activeUploads.set(fileId, { file, position: newPosition });
      
      // Continue if not finished
      if (newPosition < file.size) {
        setTimeout(() => this.sendNextChunk(fileId), 0);
      }
    };
    
    reader.readAsArrayBuffer(chunk);
  }
  
  // Get incomplete uploads on page reload
  getActiveUploads() {
    return Array.from(this.activeUploads.keys());
  }

  // Get file by ID
  getFileByFileId(fileId: string): File | undefined {
    const upload = this.activeUploads.get(fileId);
    return upload ? upload.file : undefined;
  }

}