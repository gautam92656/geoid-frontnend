"use client";

import { useMemo, useState } from "react";
import { FormField, Select, UiButton } from "@/shared/components/ui";
import type { EquipmentFieldDefinition, EquipmentType } from "../types/equipmentType";
import { getActiveEquipmentTypeOptions } from "../utils/equipmentTypeUtils";
import { ManageEquipmentTypesModal } from "./ManageEquipmentTypesModal";

type EquipmentTypeFieldProps = Readonly<{
  types: EquipmentType[];
  fieldDefinitions: EquipmentFieldDefinition[];
  onTypesChange: (types: EquipmentType[]) => void;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  className?: string;
}>;

export function EquipmentTypeField({
  types,
  fieldDefinitions,
  onTypesChange,
  value,
  onChange,
  required = false,
  error,
  className,
}: EquipmentTypeFieldProps) {
  const [manageOpen, setManageOpen] = useState(false);

  const options = useMemo(() => getActiveEquipmentTypeOptions(types), [types]);

  const handleCreated = (created: EquipmentType) => {
    onChange(String(created.id));
  };

  return (
    <>
      <FormField label="Equipment Type" required={required} error={error} className={className}>
        <div className="project-modal__inline">
          <Select
            className="project-modal__inline-control"
            value={value}
            onChange={onChange}
            options={options}
            placeholder="Select equipment type"
            search
            searchPlaceholder="Search types…"
            floatingMenu
          />
          <UiButton type="button" variant="outline" size="sm" onClick={() => setManageOpen(true)}>
            Manage
          </UiButton>
        </div>
      </FormField>

      <ManageEquipmentTypesModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        types={types}
        fieldDefinitions={fieldDefinitions}
        onChange={onTypesChange}
        onCreated={handleCreated}
      />
    </>
  );
}
