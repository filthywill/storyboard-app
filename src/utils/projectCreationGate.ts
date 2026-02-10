import { CloudAccessService } from "@/services/cloudAccessService";

export async function canCreateProjectServerSide(
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) {
    throw new Error("Missing user id for project gate");
  }

  const access = await CloudAccessService.getAccessState();

  if (!access.isAuthenticated || access.userId !== userId) {
    throw new Error("Missing user id for project gate");
  }

  if (access.reason === "unknown") {
    const error = access.error ?? new Error("Project gate check failed");
    throw error;
  }

  return access.canCreateCloudProject;
}
