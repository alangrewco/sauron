# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Sauron** is currently a minimal project repository containing only basic initialization files. The project appears to be in its early setup phase, ready for development to begin.

## Repository Structure

```
sauron/
├── README.md          # Basic project title
├── .gitignore         # Currently empty
└── .git/             # Git repository metadata
```

## Development Commands

Since this is a new project, the specific build and development commands will depend on the technology stack chosen. Here are common commands for different technology stacks that might be implemented:

### Git Operations
```bash
# Check repository status
git status

# View commit history
git log --oneline

# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Stage and commit changes
git add .
git commit -m "Your commit message"

# Push changes
git push origin main
```

### General Development Setup
```bash
# Initialize common project files based on chosen stack
# For Node.js projects:
npm init -y

# For Python projects:
python -m venv venv
source venv/bin/activate  # On macOS/Linux
pip install -r requirements.txt

# For Rust projects:
cargo init

# For Go projects:
go mod init sauron
```

## Architecture Notes

The project is currently in its initial state. As development progresses, this section should be updated to include:

- High-level system architecture
- Key components and their relationships
- Data flow patterns
- Integration points
- Technology stack decisions

## Development Guidelines

### Project Initialization
When starting development, consider:

1. **Technology Stack Selection**: Choose appropriate languages, frameworks, and tools
2. **Project Structure**: Establish a clear directory structure for the chosen stack
3. **Development Environment**: Set up consistent development environment configurations
4. **CI/CD Pipeline**: Implement automated testing and deployment workflows

### Code Organization
As the codebase grows, maintain:

- Clear separation of concerns
- Consistent naming conventions
- Proper documentation
- Test coverage for new features

### Git Workflow
- Use descriptive commit messages
- Create feature branches for new development
- Consider implementing pull request reviews
- Tag releases appropriately

## Next Steps

To begin active development:

1. Define the project's purpose and requirements
2. Choose and initialize the appropriate technology stack
3. Set up the basic project structure
4. Implement initial core functionality
5. Add testing framework and CI/CD pipeline
6. Update this WARP.md file with specific commands and architecture details

## Notes

This repository currently contains minimal files and is ready for initial development. Update this documentation as the project evolves to include specific build commands, testing procedures, and architectural details.