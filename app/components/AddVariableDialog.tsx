import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useVariableContext } from "~/hooks/useVariableContext";

interface AddVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variableName?: string;
  onSuccess?: () => void;
}

export function AddVariableDialog({
  open,
  onOpenChange,
  variableName: defaultName = "",
  onSuccess,
}: AddVariableDialogProps) {
  const { addVariable, isEnvironmentActive } = useVariableContext();
  const [name, setName] = useState(defaultName);
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<"global" | "environment">(
    isEnvironmentActive ? "environment" : "global",
  );
  const [type, setType] = useState<"default" | "secret">("default");

  React.useEffect(() => {
    if (defaultName) {
      setName(defaultName);
    }
  }, [defaultName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !value.trim()) return;

    addVariable(name, value, scope);

    // Reset form
    setName("");
    setValue("");
    setType("default");

    onOpenChange(false);
    onSuccess?.();
  };

  const handleCancel = () => {
    setName(defaultName);
    setValue("");
    setType("default");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Variable</DialogTitle>
            <DialogDescription>
              Create a new variable that can be used in your requests.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="variableName"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Value
              </Label>
              <Input
                id="value"
                type={type === "secret" ? "password" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="col-span-3"
                placeholder="Variable value"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Scope</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as "global" | "environment")}
                className="col-span-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="global" id="global" />
                  <Label htmlFor="global" className="font-normal">
                    Global (available in all environments)
                  </Label>
                </div>
                {isEnvironmentActive && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="environment" id="environment" />
                    <Label htmlFor="environment" className="font-normal">
                      Current Environment
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "default" | "secret")}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="secret">Secret (masked in UI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">Add Variable</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
