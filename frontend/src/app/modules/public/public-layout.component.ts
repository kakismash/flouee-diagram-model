import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="public-container">
      <router-outlet />
    </div>
  `,
  styleUrls: ['./public-layout.component.scss']
})
export class PublicLayoutComponent {}
