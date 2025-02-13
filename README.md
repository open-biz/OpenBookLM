# OpenBookLM

An open-source version of OpenBookLM, built with Next.js and shadcn/ui.

## Features

- Dark mode by default
- Modern UI with shadcn components
- Notebook management
- Community courses section
- Interactive chat interface
- Source management
- Notes and study tools

## Getting Started

1. Install dependencies:
```bash
pnpm install
# or
yarn install
```

Create virtual environment for python (installs `requirements.txt`)
```bash
./setup/create_venv.sh
```
Activate virtual environment
```bash
source venv/bin/activate
```
If adding additional libraries / packages to `requirements.txt`
```bash
pip install -r requirements.txt
```
Deactivate virtual environment
```bash
deactivate
```

2. Run the development server:
```bash
pnpm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - React components
- `/src/lib` - Utility functions
