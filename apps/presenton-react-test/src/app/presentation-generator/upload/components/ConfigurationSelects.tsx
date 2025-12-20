import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";

import {
  LanguageType,
  PresentationConfig,
  ToneType,
  VerbosityType,
} from "../type";

import { Check, ChevronsUpDown, SlidersHorizontal } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";

import { cn } from "../../../../lib/utils";
import { Input } from "../../../../components/ui/input";
import { Switch } from "../../../../components/ui/switch";
import { Textarea } from "../../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import ToolTip from "../../../../components/ToolTip";

// Types
interface ConfigurationSelectsProps {
  config: PresentationConfig;
  onConfigChange: (key: keyof PresentationConfig, value: any) => void;
}

type SlideOption =
  | "5"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20";

// Constants
const SLIDE_OPTIONS: SlideOption[] = [
  "5",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
];

/*** Slide Count Select ***/
const SlideCountSelect: React.FC<{
  value: string | null;
  onValueChange: (value: string) => void;
}> = ({ value, onValueChange }) => {
  const [customInput, setCustomInput] = useState(
    value && !SLIDE_OPTIONS.includes(value as SlideOption) ? value : ""
  );

  const sanitizeToPositiveInteger = (raw: string): string => {
    const digitsOnly = raw.replace(/\D+/g, "");
    if (!digitsOnly) return "";
    return digitsOnly.replace(/^0+/, "");
  };

  const applyCustomValue = () => {
    const sanitized = sanitizeToPositiveInteger(customInput);
    if (sanitized && Number(sanitized) > 0) {
      onValueChange(sanitized);
    }
  };

  return (
    <Select value={value || ""} onValueChange={onValueChange} name="slides">
      <SelectTrigger className="w-[180px] font-instrument_sans font-medium bg-blue-100 border-blue-200 focus-visible:ring-blue-300">
        <SelectValue placeholder="Select Slides" />
      </SelectTrigger>
      <SelectContent className="font-instrument_sans">
        <div
          className="sticky top-0 z-10 bg-white p-2 border-b"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={customInput}
              onChange={(e) => {
                const next = sanitizeToPositiveInteger(e.target.value);
                setCustomInput(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyCustomValue();
                }
              }}
              onBlur={applyCustomValue}
              placeholder="--"
              className="h-8 w-16 px-2 text-sm"
            />
            <span className="text-sm font-medium">slides</span>
          </div>
        </div>

        {value && !SLIDE_OPTIONS.includes(value as SlideOption) && (
          <SelectItem value={value} className="hidden">
            {value} slides
          </SelectItem>
        )}

        {SLIDE_OPTIONS.map((option) => (
          <SelectItem
            key={option}
            value={option}
            className="font-instrument_sans text-sm font-medium"
          >
            {option} slides
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

/*** Language Selector (Command + Popover) ***/
const LanguageSelect: React.FC<{
  value: string | null;
  onValueChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ value, onValueChange, open, onOpenChange }) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className="w-[200px] justify-between font-instrument_sans font-semibold overflow-hidden bg-blue-100 hover:bg-blue-100 border-blue-200"
      >
        <p className="text-sm font-medium truncate">
          {value || "Select language"}
        </p>
        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
      </Button>
    </PopoverTrigger>

    <PopoverContent className="w-[300px] p-0" align="end">
      <Command>
        <CommandInput placeholder="Search language..." />
        <CommandList>
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandGroup>
            {Object.values(LanguageType).map((language) => (
              <CommandItem
                key={language}
                value={language}
                onSelect={(currentValue) => {
                  onValueChange(currentValue);
                  onOpenChange(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === language ? "opacity-100" : "opacity-0"
                  )}
                />
                {language}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
);

/*** Main Component ***/
export const ConfigurationSelects: React.FC<ConfigurationSelectsProps> = ({
  config,
  onConfigChange,
}) => {
  const [openLanguage, setOpenLanguage] = useState(false);
  const [openAdvanced, setOpenAdvanced] = useState(false);

  const [advancedDraft, setAdvancedDraft] = useState({
    tone: config.tone,
    verbosity: config.verbosity,
    instructions: config.instructions,
    includeTableOfContents: config.includeTableOfContents,
    includeTitleSlide: config.includeTitleSlide,
    webSearch: config.webSearch,
  });

  const handleOpenAdvancedChange = (open: boolean) => {
    if (open) {
      setAdvancedDraft({
        tone: config.tone,
        verbosity: config.verbosity,
        instructions: config.instructions,
        includeTableOfContents: config.includeTableOfContents,
        includeTitleSlide: config.includeTitleSlide,
        webSearch: config.webSearch,
      });
    }
    setOpenAdvanced(open);
  };

  const handleSaveAdvanced = () => {
    Object.entries(advancedDraft).forEach(([key, value]) => {
      onConfigChange(key as keyof PresentationConfig, value);
    });
    setOpenAdvanced(false);
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <SlideCountSelect
        value={config.slides}
        onValueChange={(value) => onConfigChange("slides", value)}
      />

      <LanguageSelect
        value={config.language}
        onValueChange={(value) => onConfigChange("language", value)}
        open={openLanguage}
        onOpenChange={setOpenLanguage}
      />

      <ToolTip content="Advanced settings">
        <button
          type="button"
          onClick={() => handleOpenAdvancedChange(true)}
          className="ml-auto flex items-center gap-2 text-sm underline underline-offset-4 bg-blue-100 p-2 rounded-md"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </ToolTip>

      <Dialog open={openAdvanced} onOpenChange={handleOpenAdvancedChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advanced settings</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Tone */}
            <div>
              <label className="text-sm font-semibold">Tone</label>
              <Select
                value={advancedDraft.tone}
                onValueChange={(value) =>
                  setAdvancedDraft((p) => ({ ...p, tone: value as ToneType }))
                }
              >
                <SelectTrigger className="w-full bg-blue-100 border-blue-200">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ToneType).map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Verbosity */}
            <div>
              <label className="text-sm font-semibold">Verbosity</label>
              <Select
                value={advancedDraft.verbosity}
                onValueChange={(value) =>
                  setAdvancedDraft((p) => ({
                    ...p,
                    verbosity: value as VerbosityType,
                  }))
                }
              >
                <SelectTrigger className="w-full bg-blue-100 border-blue-200">
                  <SelectValue placeholder="Select verbosity" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(VerbosityType).map((verbosity) => (
                    <SelectItem key={verbosity} value={verbosity}>
                      {verbosity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Switches */}
            <div className="p-3 bg-blue-100 rounded-md">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Include table of contents
                </label>
                <Switch
                  checked={advancedDraft.includeTableOfContents}
                  onCheckedChange={(checked) =>
                    setAdvancedDraft((p) => ({
                      ...p,
                      includeTableOfContents: checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="p-3 bg-blue-100 rounded-md">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Title slide</label>
                <Switch
                  checked={advancedDraft.includeTitleSlide}
                  onCheckedChange={(checked) =>
                    setAdvancedDraft((p) => ({
                      ...p,
                      includeTitleSlide: checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="p-3 bg-blue-100 rounded-md">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Web search</label>
                <Switch
                  checked={advancedDraft.webSearch}
                  onCheckedChange={(checked) =>
                    setAdvancedDraft((p) => ({ ...p, webSearch: checked }))
                  }
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold">Instructions</label>
              <Textarea
                value={advancedDraft.instructions}
                rows={4}
                onChange={(e) =>
                  setAdvancedDraft((p) => ({
                    ...p,
                    instructions: e.target.value,
                  }))
                }
                className="min-h-[100px] max-h-[200px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdvanced(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdvanced} className="bg-[#5141e5] text-white">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
