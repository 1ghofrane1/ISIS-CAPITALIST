import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideApollo, withApolloOptions } from '@apollo-orbit/angular';
import { HttpLinkFactory, withHttpLink } from '@apollo-orbit/angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { BACKEND_URL } from './graphql/backend-url';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideApollo(
      withHttpLink(),
      withApolloOptions(() => ({
        cache: new InMemoryCache(),
        link: inject(HttpLinkFactory).create({
          uri: `${BACKEND_URL}/graphql`,
        }),
      })),
    ),
  ],
};
