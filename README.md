# Pulp UI

A React-based user interface for the Pulp project, providing a modern web interface to manage repositories, distributions, publications, and remotes for RPM, File, and Debian content types.

## Features

- **User Authentication**: Secure login system that validates credentials against the Pulp API
- **Collapsible Navigation Drawer**: Easy access to all sections with expandable categories
- **Content Type Management**: 
  - RPM (Distributions, Publications, Remotes, Repositories)
  - File (Distributions, Publications, Remotes, Repositories)
  - Debian (Distributions, Publications, Remotes, Repositories)
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
./tests/run_container.sh  npm run test:coverage
```

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
│   └── *.test.tsx      # Component tests
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
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
- **Vitest**: Testing framework
- **Testing Library**: Component testing utilities

## License

This project is part of the Pulp project ecosystem.
