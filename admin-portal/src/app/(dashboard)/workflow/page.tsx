import { WorkflowKanban } from '../../../components/workflow/WorkflowKanban';

export const metadata = {
  title: 'Editorial Workflow | Jupsoft CMS',
  description: 'Track, review, approve and publish articles through the RBAC editorial pipeline',
};

export default function WorkflowPage() {
  return <WorkflowKanban />;
}
