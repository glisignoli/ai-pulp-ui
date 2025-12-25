# Pulp UI

A React-based user interface for the Pulp project, providing a modern web interface to manage repositories, distributions, publications, and remotes for RPM, File, and DEB content types.

## Features

- **User Authentication**: Secure login system that validates credentials against the Pulp API
- **Collapsible Navigation Drawer**: Easy access to all sections with expandable categories
- **Content Type Management**: 
  - RPM (Distributions, Publications, Remotes, Repositories)
  - File (Distributions, Publications, Remotes, Repositories)
  - DEB (Distributions, Publications, Remotes, Repositories)
- **Dashboard**: Overview of all content types and quick access links
- **Responsive Design**: Built with Material-UI for a modern, responsive interface

## Prerequisites

- Node.js 18+ and npm
- Running Pulp backend at `http://localhost:8080/pulp/api/v3/`

## Installation

Install dependencies:

```bash
npm install
```

## Development

Start the development server:

```bash
./tests/run_container.sh npm run dev -- --host 0.0.0.0
```

The application will be available at `http://localhost:3000`

## Building for Production

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
./tests/run_container.sh npm run preview
```

## Testing

### Unit & Integration Tests

Run tests:

```bash
./tests/run_container.sh npm test
```

Run tests in UI mode:

```bash
./tests/run_container.sh npm run test:ui
```

Run tests with coverage:

```bash
./tests/run_container.sh npm run test:coverage
```

### End-to-End Tests (Playwright)

Run browser rendering tests:

```bash
./tests/run_container.sh npm run test:e2e
```

Run E2E tests with interactive UI:

```bash
./tests/run_container.sh npm run test:e2e:ui
```

Run E2E tests in debug mode:

```bash
./tests/run_container.sh npm run test:e2e:debug
```

The Playwright tests verify:
- Pages render without console errors
- No JavaScript module import errors
- UI elements are visible and functional
- Navigation works correctly
- Authentication flow
- All RPM, File, and DEB sections

See [e2e/README.md](e2e/README.md) for more details about E2E testing.

### Testing in Container

To run tests in a containerized environment (matching the Pulp backend setup):

```bash
./tests/run_container.sh npm test
```

## Project Structure

```
src/
├── components/           # React components
│   ├── common/          # Reusable components
│   ├── rpm/             # RPM-specific components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Header.tsx       # Application header
│   ├── Layout.tsx       # Main layout wrapper
│   ├── Login.tsx        # Login page
│   ├── NavigationDrawer.tsx  # Side navigation
│   └── ProtectedRoute.tsx    # Route protection
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
├── services/            # API services
│   └── api.ts          # API service layer
├── types/              # TypeScript types
│   └── pulp.ts         # Pulp-specific types
├── test/               # Test files
├── deb.spec.ts         # DEB section tests
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
e2e/                    # End-to-end tests (Playwright)
├── helpers/            # Test helpers and utilities
│   └── api-mocker.ts   # API mocking utilities
├── auth.spec.ts        # Authentication tests
├── deb.spec.ts         # DEB section tests
├── file.spec.ts        # File section tests
├── mocked-api.spec.ts  # Tests with mocked API
├── navigation.spec.ts  # Navigation tests
├── render.spec.ts      # Basic rendering tests
├── rpm.spec.ts         # RPM section tests
└── README.md           # E2E testing documentation
tests/                  # Test infrastructure
├── run_container.sh    # Container runner for unit tests
└── run_playwright.sh   # Container runner for E2E tests
```

## API Configuration

The application communicates with the Pulp backend at `http://localhost:8080/pulp/api/v3/`. To change this:

1. Edit [src/services/api.ts](src/services/api.ts)
2. Update the `API_BASE_URL` constant

## Authentication

The login system validates credentials against the `/groups/` endpoint of the Pulp API. Upon successful authentication, credentials are stored securely and used for subsequent API calls.

## Technologies Used

- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Material-UI**: Component library
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Vite**: Build tool and dev server
- **Vitest**: Unit testing framework
- **Testing Library**: Component testing utilities
- **Playwright**: End-to-end browser testing

## License

This project is part of the Pulp project ecosystem.
