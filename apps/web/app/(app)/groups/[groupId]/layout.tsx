import { GroupShell } from '@/components/groups/group-shell';

/** Every page inside a group shares the header and the tab row. */
export default async function GroupLayout({
    params,
    children,
}: Readonly<{ params: Promise<{ groupId: string }>; children: React.ReactNode }>) {
    const { groupId } = await params;
    return <GroupShell groupId={groupId}>{children}</GroupShell>;
}
