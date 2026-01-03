"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronsUpDown, Plus, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type WorkspaceItem = {
    id: string;
    name: string;
};

interface WorkspaceSwitcherProps {
    workspaces: WorkspaceItem[];
    currentWorkspaceId?: string;
}

export function WorkspaceSwitcher({
    workspaces,
    currentWorkspaceId,
}: WorkspaceSwitcherProps) {
    const router = useRouter();
    const pathname = usePathname();

    const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

    const handleSelect = (workspaceId: string) => {
        // Replace the current workspace ID in the path
        const newPath = pathname.replace(
            /\/w\/[^/]+/,
            `/w/${workspaceId}`
        );
        router.push(newPath || `/w/${workspaceId}/dashboard`);
    };

    const handleCreateNew = () => {
        router.push("/onboarding/create-workspace");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                >
                    <span className="truncate">
                        {currentWorkspace?.name || "Select workspace"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map((workspace) => (
                    <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => handleSelect(workspace.id)}
                        className="cursor-pointer"
                    >
                        <Check
                            className={`mr-2 h-4 w-4 ${currentWorkspaceId === workspace.id
                                ? "opacity-100"
                                : "opacity-0"
                                }`}
                        />
                        <span className="truncate">{workspace.name}</span>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCreateNew} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Create new workspace
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
