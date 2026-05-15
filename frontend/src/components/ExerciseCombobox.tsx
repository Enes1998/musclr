import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { EXERCISES } from "../lib/exercises";
import type { Exercise, MuscleId } from "../lib/exercises";

interface ExerciseComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

type ComboGroupId =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "legs"
  | "other";

const COMBO_GROUPS: Array<{ id: ComboGroupId; label: string }> = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "core", label: "Core" },
  { id: "legs", label: "Legs" },
];

const PRIMARY_TO_COMBO_GROUP: Record<MuscleId, ComboGroupId> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  core: "core",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
};

export default function ExerciseCombobox({
  value,
  onChange,
  className = "",
  inputRef,
}: ExerciseComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const listboxId = useId();

  const getPrimaryMuscleGroup = (exercise: Exercise): ComboGroupId => {
    const primaryEntries = Object.entries(exercise.primary || {}) as Array<
      [MuscleId, number]
    >;
    if (primaryEntries.length === 0) return "other";
    primaryEntries.sort(([, a], [, b]) => b - a);
    return PRIMARY_TO_COMBO_GROUP[primaryEntries[0][0]];
  };

  const getMatchRank = (exerciseName: string, search: string) => {
    if (!search) return 0;
    const normalizedName = exerciseName.toLowerCase();
    if (normalizedName === search) return 0;
    if (normalizedName.startsWith(search)) return 1;
    if (normalizedName.split(/\s+/).some((word) => word.startsWith(search)))
      return 2;
    if (normalizedName.includes(search)) return 3;
    return Number.POSITIVE_INFINITY;
  };

  // Group exercises by primary muscle and prioritize stronger query matches.
  const groupedExercises = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const groups: Record<string, Exercise[]> = {};

    for (const exercise of EXERCISES) {
      const rank = getMatchRank(exercise.name, normalizedQuery);
      if (!Number.isFinite(rank)) continue;

      const primaryId = getPrimaryMuscleGroup(exercise);
      if (!groups[primaryId]) groups[primaryId] = [];
      groups[primaryId].push(exercise);
    }

    for (const groupKey of Object.keys(groups)) {
      groups[groupKey].sort((a, b) => {
        const rankA = getMatchRank(a.name, normalizedQuery);
        const rankB = getMatchRank(b.name, normalizedQuery);
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
    }

    const orderedGroups: Array<{
      id: string;
      label: string;
      exercises: Exercise[];
    }> = [];
    for (const muscleGroup of COMBO_GROUPS) {
      if (groups[muscleGroup.id]?.length) {
        orderedGroups.push({
          id: muscleGroup.id,
          label: muscleGroup.label,
          exercises: groups[muscleGroup.id],
        });
      }
    }

    if (groups.other?.length) {
      orderedGroups.push({
        id: "other",
        label: "Other",
        exercises: groups.other,
      });
    }

    return orderedGroups;
  }, [query]);

  // Flatten options for keyboard navigation.
  const flatOptions = useMemo(() => {
    const flat: string[] = [];
    groupedExercises.forEach((group) => {
      group.exercises.forEach((exercise) => flat.push(exercise.name));
    });
    return flat;
  }, [groupedExercises]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    optionRefs.current = {};
  }, [groupedExercises]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setQuery("");
        setActiveIndex(0);
      } else {
        if (flatOptions.length === 0) return;
        setActiveIndex((prev) => (prev + 1) % flatOptions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen || flatOptions.length === 0) return;
      setActiveIndex(
        (prev) => (prev - 1 + flatOptions.length) % flatOptions.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && flatOptions.length > 0) {
        const selected =
          flatOptions[Math.min(activeIndex, flatOptions.length - 1)];
        onChange(selected);
        setQuery(selected);
        setIsOpen(false);
      } else if (!isOpen) {
        setIsOpen(true);
        setQuery("");
        setActiveIndex(0);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setQuery("");
    }
  };

  const handleSelect = (name: string) => {
    onChange(name);
    setQuery(name);
    setIsOpen(false);
  };

  let optionIndex = -1;
  const activeDescendantId =
    isOpen && activeIndex >= 0 && activeIndex < flatOptions.length
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  return (
    <div className={`combo-container ${className}`} ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className="combo-input"
        value={isOpen ? query : value}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setQuery("");
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search exercise..."
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        aria-autocomplete="list"
      />

      {isOpen && (
        <div className="combo-dropdown" id={listboxId} role="listbox">
          {groupedExercises.length === 0 ? (
            <div className="combo-empty">No matches found.</div>
          ) : (
            groupedExercises.map((group) => (
              <div key={group.id} className="combo-group">
                <div className="combo-group-label">{group.label}</div>
                {group.exercises.map((exercise) => {
                  optionIndex += 1;
                  const index = optionIndex;
                  const isActive = index === activeIndex;
                  return (
                    <div
                      key={`${group.id}-${exercise.name}`}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={isActive}
                      className={`combo-option ${isActive ? "active" : ""}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelect(exercise.name);
                      }}
                    >
                      {exercise.name}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
