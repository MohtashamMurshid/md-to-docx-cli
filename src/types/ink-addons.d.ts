declare module "ink-gradient" {
  import { FC, ReactNode } from "react";
  const Gradient: FC<{ name?: string; children?: ReactNode }>;
  export default Gradient;
}

declare module "ink-big-text" {
  import { FC } from "react";
  const BigText: FC<{ text: string; font?: string }>;
  export default BigText;
}

declare module "ink-select-input" {
  import { FC } from "react";
  export type SelectItem<T = any> = { label: string; value: T };
  const SelectInput: FC<{
    items: SelectItem[];
    onSelect?: (item: SelectItem) => void;
    onHighlight?: (item: SelectItem) => void;
  }>;
  export default SelectInput;
}
