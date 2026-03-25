import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useCreateWhatsAppConfig } from "@/shared/hooks/useWhatsAppConfig";

interface WhatsAppConfigDialogProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppConfigDialog({
  companyId,
  open,
  onOpenChange,
}: WhatsAppConfigDialogProps) {
  const [phoneNumberId, setPhoneNumberId] = useState("");

  const { mutateAsync: createConfig, isPending } =
    useCreateWhatsAppConfig(companyId);

  const isDirty = useMemo(() => {
    return phoneNumberId.trim() !== "";
  }, [phoneNumberId]);

  const isValid = phoneNumberId.trim() !== "";

  function handleOpenChange(value: boolean) {
    if (!value) {
      setPhoneNumberId("");
    }
    onOpenChange(value);
  }

  async function handleSave() {
    try {
      await createConfig({
        phoneNumberId: phoneNumberId.trim(),
      });
      toast.success("WhatsApp configured successfully");
      handleOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to configure WhatsApp",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wa-phone-number-id">Phone Number ID</Label>
            <Input
              id="wa-phone-number-id"
              placeholder="Meta WhatsApp Business phone number ID"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || !isValid || isPending}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
