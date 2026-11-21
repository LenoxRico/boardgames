import { Routes } from '@angular/router';
import { ResponsiveShellComponent } from './shared/components/responsive-shell/responsive-shell.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { HistoryComponent } from './pages/history/history.component';
import { RulesViewerComponent } from './pages/rules-viewer/rules-viewer.component';
import { NewMatchComponent } from './pages/new-match/new-match.component';
import { MatchLiveComponent } from './pages/match-live/match-live.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/catalog',
    pathMatch: 'full',
  },
  {
    path: 'tabs',
    component: ResponsiveShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'catalog',
        pathMatch: 'full',
      },
      {
        path: 'catalog',
        component: CatalogComponent,
      },
      {
        path: 'history',
        component: HistoryComponent,
      },
      {
        path: 'rules',
        component: RulesViewerComponent,
      },
    ],
  },
  {
    path: 'match/new/:gameId',
    component: NewMatchComponent,
  },
  {
    path: 'match/live/:matchId',
    component: MatchLiveComponent,
  },
  {
    path: '**',
    redirectTo: 'tabs/catalog',
  },
];
