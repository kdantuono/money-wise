#!/usr/bin/env python3
"""
Script to create GitHub issues for all 142 micro-tasks from Milestone 1 document.
This implements the divide-and-conquer approach for board consistency.
"""

import re
import os
import sys
import json
import subprocess
from pathlib import Path
from typing import List, Dict, Optional

class MicroTaskCreator:
    def __init__(self, repo: str = None, milestone_doc: str = None, project_id: str = None):
        self.repo = repo or os.getenv('GITHUB_REPO', 'kdantuono/money-wise')
        self.milestone_doc = milestone_doc or os.getenv('MILESTONE_DOC', 'docs/planning/milestones/Milestone 1 - Foundation (Detailed Micro-Tasks).md')
        self.project_id = project_id or os.getenv('PROJECT_ID', '3')
        self.created_issues = []

    def read_milestone_document(self) -> str:
        """Read the Milestone 1 document."""
        with open(self.milestone_doc, 'r') as f:
            return f.read()

    def parse_tasks(self, content: str) -> List[Dict]:
        """Parse tasks from the milestone document."""
        tasks = []

        # Pattern to match task sections
        task_pattern = r'##### \[(TASK-\d+-\d+)\] (.+?)\n(.*?)(?=\n##### \[TASK|\n\n## |$)'

        matches = re.finditer(task_pattern, content, re.DOTALL)

        for match in matches:
            task_id = match.group(1)
            task_title = match.group(2)
            task_content = match.group(3)

            # Extract details from task content
            points_match = re.search(r'- \*\*Points\*\*: ([\d.]+)', task_content)
            agent_match = re.search(r'- \*\*Agent\*\*: (.+)', task_content)
            branch_match = re.search(r'- \*\*Branch\*\*: (.+)', task_content)
            dependencies_match = re.search(r'- \*\*Dependencies\*\*: (.+)', task_content)
            acceptance_match = re.search(r'\*\*Acceptance Criteria\*\*:(.*?)(?=\n\n|\n---|\Z)', task_content, re.DOTALL)

            # Determine parent story
            parent_story = self.determine_parent_story(task_id)

            task = {
                'id': task_id,
                'title': task_title,
                'content': task_content,
                'points': points_match.group(1) if points_match else '0',
                'agent': agent_match.group(1) if agent_match else 'Unknown',
                'branch': branch_match.group(1) if branch_match else '',
                'dependencies': dependencies_match.group(1) if dependencies_match else 'None',
                'acceptance_criteria': acceptance_match.group(1).strip() if acceptance_match else '',
                'parent_story': parent_story
            }

            tasks.append(task)

        return tasks

    def determine_parent_story(self, task_id: str) -> str:
        """Determine which parent story a task belongs to."""
        if task_id.startswith('TASK-001'):
            return 'STORY-001'  # Repository and Development Environment
        elif task_id.startswith('TASK-002'):
            return 'STORY-002'  # CI/CD Pipeline
        elif task_id.startswith('TASK-003'):
            return 'STORY-003'  # Testing Infrastructure
        else:
            return 'UNKNOWN'

    def create_github_issue(self, task: Dict) -> Optional[str]:
        """Create a GitHub issue for a micro-task."""

        # Create issue body
        body = f"""## Micro-Task from Milestone 1

**Task ID**: {task['id']}
**Parent Story**: {task['parent_story']}
**Story Points**: {task['points']}
**Assigned Agent**: {task['agent']}
**Branch**: {task['branch']}
**Dependencies**: {task['dependencies']}

## Description
{task['title']}

## Acceptance Criteria
{task['acceptance_criteria']}

## Technical Details
```
{task['content']}
```

---
*Auto-generated from Milestone 1 planning document*
*Part of board consistency alignment project*
"""

        # Prepare GitHub CLI command
        cmd = [
            'gh', 'issue', 'create',
            '--repo', self.repo,
            '--title', f"[{task['id']}] {task['title']}",
            '--body', body,
            '--label', 'enhancement'
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            issue_url = result.stdout.strip()
            print(f"✅ Created: {task['id']} - {issue_url}")
            return issue_url
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to create {task['id']}: {e.stderr}")
            return None

    def create_all_tasks(self, limit: Optional[int] = None) -> List[str]:
        """Create GitHub issues for all micro-tasks."""
        print("📖 Reading Milestone 1 document...")
        content = self.read_milestone_document()

        print("🔍 Parsing micro-tasks...")
        tasks = self.parse_tasks(content)

        if limit:
            tasks = tasks[:limit]
            print(f"⚠️ Limited to first {limit} tasks for testing")

        print(f"🎯 Found {len(tasks)} micro-tasks to create")

        created_urls = []

        for i, task in enumerate(tasks, 1):
            print(f"\n[{i}/{len(tasks)}] Creating {task['id']}: {task['title']}")

            # Create the issue
            url = self.create_github_issue(task)
            if url:
                created_urls.append(url)
                self.created_issues.append({
                    'task_id': task['id'],
                    'title': task['title'],
                    'url': url,
                    'parent_story': task['parent_story']
                })

        return created_urls

    def save_results(self):
        """Save the creation results to a file."""
        results_file = "/home/nemesi/dev/money-wise/.claude/scripts/micro-tasks-results.json"

        results = {
            'created_count': len(self.created_issues),
            'created_issues': self.created_issues,
            'summary_by_story': self.get_summary_by_story()
        }

        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n📊 Results saved to: {results_file}")

    def get_summary_by_story(self) -> Dict:
        """Get summary of created tasks by parent story."""
        summary = {}
        for issue in self.created_issues:
            story = issue['parent_story']
            if story not in summary:
                summary[story] = []
            summary[story].append(issue['task_id'])

        return summary

    def print_summary(self):
        """Print creation summary."""
        print(f"\n🎉 SUMMARY: Created {len(self.created_issues)} micro-task issues")

        summary = self.get_summary_by_story()
        for story, tasks in summary.items():
            print(f"  {story}: {len(tasks)} tasks")

        print(f"\n📋 Total micro-tasks created: {len(self.created_issues)}/142")

def main():
    """Main function."""
    import argparse

    parser = argparse.ArgumentParser(description='Create GitHub issues for Milestone 1 micro-tasks')
    parser.add_argument('--limit', type=int, help='Limit number of tasks to create (for testing)')
    parser.add_argument('--dry-run', action='store_true', help='Parse tasks but do not create issues')

    args = parser.parse_args()

    creator = MicroTaskCreator()

    if args.dry_run:
        print("🔍 DRY RUN: Parsing tasks without creating issues...")
        content = creator.read_milestone_document()
        tasks = creator.parse_tasks(content)
        print(f"Found {len(tasks)} tasks that would be created")
        for task in tasks[:5]:  # Show first 5
            print(f"  {task['id']}: {task['title']}")
        if len(tasks) > 5:
            print(f"  ... and {len(tasks) - 5} more")
    else:
        print("🚀 Creating micro-task GitHub issues...")
        created_urls = creator.create_all_tasks(args.limit)
        creator.save_results()
        creator.print_summary()

if __name__ == "__main__":
    main()