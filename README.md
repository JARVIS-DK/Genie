# Genie - Generative Innovative Engine

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

🚀 **Genie** is a powerful super agent built with modern technologies, designed to revolutionize how we interact with AI systems. This innovative engine combines the best of frontend and backend technologies to create an intelligent, responsive, and scalable platform.

## What is Genie?

Genie is a **Generative Innovative Engine** - a super agent that leverages cutting-edge AI technologies to provide intelligent solutions and seamless user experiences. Built on a robust Nx monorepo architecture, Genie offers:

- 🧠 **Intelligent Processing**: Advanced AI capabilities for complex problem-solving
- 🔄 **Real-time Interactions**: Fast, responsive user interfaces
- 🏗️ **Scalable Architecture**: Built with modern microservices and frontend frameworks
- 🛡️ **Enterprise Ready**: Robust backend with security and performance optimizations
- 🎯 **User-Centric Design**: Intuitive interfaces that adapt to user needs

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/js?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore the project architecture.

## Finish your remote caching setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/F2qBoLKKf1)


## Project Architecture

Genie is built using a modern monorepo structure with the following components:

- **Frontend** (`apps/genie-frontend`): React-based user interface with modern tooling
- **Backend** (`apps/genie-backend`): Go-based API server with robust data handling
- **Shared Libraries** (`libs/shared`): Common utilities and database connectors
- **Enums** (`libs/enums`): Shared type definitions and constants


## Getting Started

### Common Setup

First, install all dependencies at the root level:

```sh
npm install
```

### Running the Projects

#### Frontend
To run the frontend application:

```sh
npx nx run apps/genie-frontend:serve
```

#### Backend
To run the backend application:

```sh
npx nx run apps/genie-backend:serve
```

## Development Tasks

### Building the Projects

To build the frontend application:

```sh
npx nx build genie-frontend
```

To build the backend application:

```sh
npx nx build genie-backend
```

### Running Tests

To run tests for all projects:

```sh
npx nx run-many --target=test --all
```

### General Task Execution

To run any task with Nx use:

```sh
npx nx <target> <project-name>
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Deployment and Release

### Versioning and Releasing

To version and release the Genie super agent:

```
npx nx release
```

Pass `--dry-run` to see what would happen without actually releasing the application.

### Production Deployment

Genie is designed for enterprise deployment with:
- Containerized applications for easy scaling
- Environment-specific configurations
- Automated CI/CD pipeline integration
- Health monitoring and logging

[Learn more about Nx release &raquo;](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json` files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is automatically done when running tasks such as `build` or `typecheck`, which require updated references to function correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references, run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)


[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Technology Stack

### Frontend
- **React** with TypeScript for type-safe development
- **Vite** for fast development and building
- **Tailwind CSS** for modern, responsive styling
- **ESLint** for code quality and consistency

### Backend
- **Go** for high-performance API development
- **Gin** framework for HTTP routing and middleware
- **MongoDB** for flexible data storage
- **JWT** for secure authentication

### Development Tools
- **Nx** for monorepo management and task orchestration
- **TypeScript** for type safety across the stack
- **ESLint** and **Prettier** for code formatting
- **Git** for version control

## Contributing to Genie

We welcome contributions to make Genie even more powerful! Please see our contributing guidelines and code of conduct.

## Useful Links

### Genie Documentation
- [Frontend Architecture](apps/genie-frontend/README.md)
- [Backend API Documentation](apps/genie-backend/README.md)
- [Shared Libraries](libs/shared/README.md)

### Nx Resources
- [Learn more about this workspace setup](https://nx.dev/nx-api/js?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Community
- [Nx Discord](https://go.nx.dev/community)
- [Follow Nx on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Nx Youtube channel](https://www.youtube.com/@nxdevtools)
- [Nx blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

---

**Genie - Generative Innovative Engine** | *Empowering the future with intelligent super agents*
