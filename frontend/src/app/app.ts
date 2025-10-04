import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { ThemeSelectorComponent } from './components/theme-selector/theme-selector.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ThemeSelectorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  
  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    // Initialize theme service
    this.themeService.getCurrentTheme();
  }
}
