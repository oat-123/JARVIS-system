
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Person {
  "ลำดับ": string;
  "ยศ": string;
  "ชื่อ": string;
  "สกุล": string;
  "ชั้นปีที่": string;
  "ตอน": string;
  "ตำแหน่ง": string;
  "สังกัด": string;
  "เบอร์โทรศัพท์": string;
  "หน้าที่"?: string;
  "ชมรม"?: string;
  "สถิติโดนยอด": string;
}

interface PersonAutocompleteProps {
  people: Person[];
  value: Person | null;
  onSelect: (person: Person | null) => void;
}

export function PersonAutocomplete({
  people,
  value,
  onSelect,
}: PersonAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (person: Person) => {
    onSelect(person);
    setInputValue("");
    setOpen(false);
  };

  const filterPeople = (search: string): Person[] => {
    if (!search) {
      return people.slice(0, 100); // Limit initial results
    }

    const lowercasedSearch = search.toLowerCase().trim();
    const searchTerms = lowercasedSearch.split(/\s+/).filter(Boolean);

    if (searchTerms.length === 0) {
      return people.slice(0, 100);
    }

    const firstTerm = searchTerms[0];
    const secondTerm = searchTerms.length > 1 ? searchTerms[1] : null;

    return people
      .filter((person) => {
        const firstName = person.ชื่อ.toLowerCase();
        const lastName = person.สกุล.toLowerCase();

        if (searchTerms.length === 1) {
          return firstName.startsWith(firstTerm) || lastName.startsWith(firstTerm);
        }

        if (secondTerm) {
          return firstName.startsWith(firstTerm) && lastName.startsWith(secondTerm);
        }

        return false; // Should not happen if searchTerms is not empty
      })
      .slice(0, 100);
  };
  
  const filtered = filterPeople(inputValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent border-slate-600 text-white hover:bg-slate-700"
        >
          {value ? `${value.ชื่อ} ${value.สกุล}` : "เลือกรายชื่อ..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-slate-800 border-slate-700 text-white">
        <Command>
          <CommandInput
            placeholder="ค้นหาชื่อ..."
            value={inputValue}
            onValueChange={setInputValue}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>ไม่พบรายชื่อ</CommandEmpty>
            <CommandGroup>
              {filtered.map((person) => (
                <CommandItem
                  key={person.ลำดับ}
                  value={`${person.ชื่อ} ${person.สกุล}`}
                  onSelect={() => handleSelect(person)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.ลำดับ === person.ลำดับ ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <p>{person.ชื่อ} {person.สกุล}</p>
                    <p className="text-xs text-slate-400">{person.สังกัด} - ชั้นปี {person.ชั้นปีที่}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
