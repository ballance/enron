# Contributing to Enron Email Dataset Project

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Ways to Contribute

- **Bug Reports**: Submit detailed bug reports with reproduction steps
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit pull requests for bug fixes or new features
- **Documentation**: Improve or expand documentation
- **Performance**: Optimize queries, loading scripts, or data processing
- **Analytics**: Add new example queries or analysis tools

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/enron.git
   cd enron
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

Follow the setup instructions in [README.md](README.md) to get the development environment running.

### Prerequisites
- Docker & Docker Compose
- Python 3.8+
- Node.js 18+ (for web UI)
- PostgreSQL knowledge recommended

## Coding Standards

### Python Code
- Follow [PEP 8](https://pep8.org/) style guide
- Use meaningful variable and function names
- Add docstrings for functions and classes
- Include type hints where appropriate
- Write unit tests for new functionality

### JavaScript/Node.js Code
- Use ES6+ modern JavaScript syntax
- Follow consistent formatting (use Prettier if available)
- Write clear, self-documenting code
- Add JSDoc comments for complex functions
- Include tests for new features

### SQL
- Use consistent formatting and indentation
- Add comments for complex queries
- Optimize for performance
- Test queries with large datasets

## Commit Guidelines

- Write clear, descriptive commit messages
- Use present tense ("Add feature" not "Added feature")
- Reference issue numbers when applicable
- Keep commits focused on a single change

Example:
```
Add email sentiment analysis query

- Implement sentiment scoring function
- Add example query to example_queries.sql
- Update README with new feature

Fixes #123
```

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features or bug fixes
3. **Ensure all tests pass** before submitting
4. **Update README.md** if adding new features
5. **Fill out the PR template** with details about your changes
6. **Link related issues** in your PR description

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Documentation is updated
- [ ] Tests are included and passing
- [ ] Commit messages are clear
- [ ] Branch is up to date with main
- [ ] No merge conflicts

## Testing

### Python Tests
```bash
pytest tests/
```

### JavaScript Tests
```bash
cd backend && npm test
cd frontend && npm test
```

### Integration Tests
```bash
# Test the full pipeline
make test-pipeline
```

## Code Review

- All submissions require review before merging
- Reviewers may request changes or improvements
- Be responsive to feedback and questions
- Be respectful and constructive in discussions

## Areas for Contribution

We especially welcome contributions in these areas:

### Performance Optimization
- Faster data loading strategies
- Query optimization
- Index improvements
- Memory usage reduction

### Analytics & Queries
- Network analysis queries
- Temporal analysis
- Community detection
- Anomaly detection

### Visualization
- Interactive graph visualizations
- Timeline visualizations
- Dashboard improvements
- D3.js integrations

### Machine Learning
- Email classification
- Topic modeling
- Entity extraction
- Relationship prediction

### Infrastructure
- Kubernetes deployment
- Cloud provider templates
- CI/CD pipelines
- Monitoring and logging

## Reporting Issues

When reporting issues, please include:

1. **Description**: Clear description of the problem
2. **Reproduction Steps**: How to reproduce the issue
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, Python/Node version, Docker version
6. **Logs**: Relevant error messages or stack traces

## Questions?

- Open an issue with the `question` label
- Check existing issues and documentation first
- Provide context and what you've already tried

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be acknowledged in:
- GitHub contributors list
- Project README (for significant contributions)
- Release notes

Thank you for contributing! 🎉
