import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';
  myWorker:SharedWorker;
  ngOnInit(): void {
    const myWorker = new SharedWorker("worker.js");
  }

}
