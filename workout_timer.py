import json
import sys
import tkinter as tk
from tkinter import font
from pathlib import Path


class WorkoutTimer:
    def __init__(self, root, workout):
        self.root = root
        self.workout = workout
        self.sound_enabled = workout.get("sound", True)
        self.steps = self.expand_workout(workout)

        self.current_step = 0
        self.remaining = 0
        self.after_id = None
        self.paused = False
        self.workout_started = False

        self.root.title("Workout Timer")
        self.root.geometry("1000x600")
        self.root.configure(bg="black")

        self.big_font = font.Font(family="Helvetica", size=34, weight="bold")
        self.mid_font = font.Font(family="Helvetica", size=20)
        self.small_font = font.Font(family="Helvetica", size=14)
        self.timer_font = font.Font(family="Helvetica", size=34, weight="bold")

        self.title_label = tk.Label(
            root,
            text="",
            font=self.big_font,
            fg="white",
            bg="black",
            wraplength=920,
            justify="center",
        )
        self.title_label.pack(pady=(40, 20))

        self.detail_label = tk.Label(
            root,
            text="",
            font=self.mid_font,
            fg="lightgray",
            bg="black",
            wraplength=920,
            justify="center",
        )
        self.detail_label.pack(pady=10)

        self.timer_label = tk.Label(
            root,
            text="",
            font=self.timer_font,
            fg="cyan",
            bg="black",
        )
        self.timer_label.pack(pady=30)

        self.progress_label = tk.Label(
            root,
            text="",
            font=self.small_font,
            fg="gray",
            bg="black",
        )
        self.progress_label.pack(pady=(10, 10))

        self.up_next_label = tk.Label(
            root,
            text="",
            font=self.small_font,
            fg="lightgray",
            bg="black",
        )
        self.up_next_label.pack(pady=(0, 10))

        self.help_label = tk.Label(
            root,
            text="Space = start / finish manual set / continue    |    P = pause/resume    |    N = next step    |    Esc = quit",
            font=self.small_font,
            fg="gray",
            bg="black",
        )
        self.help_label.pack(side="bottom", pady=20)

        self.root.bind("<space>", self.on_space)
        self.root.bind("<Escape>", lambda event: self.root.destroy())
        self.root.bind("p", self.toggle_pause)
        self.root.bind("P", self.toggle_pause)
        self.root.bind("n", self.next_step)
        self.root.bind("N", self.next_step)

        self.show_start_screen()

    def show_start_screen(self):
        self.title_label.config(text="Ready to start")
        self.detail_label.config(text="Press SPACE to begin the workout")
        self.timer_label.config(text="")
        self.progress_label.config(text=f"Step 1 / {len(self.steps)}")
        first_title = self.steps[0].get("title", "") if self.steps else ""
        self.up_next_label.config(text=f"Up next: {first_title}")

    def play_alert_sound(self, repeat=3, interval_ms=120):
        if not self.sound_enabled:
            return

        # Repeating the bell makes alerts more noticeable than a single default beep.
        for i in range(repeat):
            self.root.after(i * interval_ms, self.root.bell)

    def next_step_title(self):
        next_index = self.current_step + 1
        if next_index < len(self.steps):
            return self.steps[next_index].get("title", "")
        return "Workout complete"

    def expand_workout(self, workout):
        expanded = []

        sections = workout.get("sections", [])
        if not sections:
            raise ValueError("Workout JSON must contain a non-empty 'sections' list.")

        workout_rounds = int(workout.get("total_rounds", 1))
        if workout_rounds < 1:
            raise ValueError("'total_rounds' must be at least 1.")

        for workout_round in range(1, workout_rounds + 1):
            for section_index, section in enumerate(sections):
                expanded.extend(
                    self.expand_section(
                        section,
                        workout_round=workout_round,
                        workout_rounds=workout_rounds,
                    )
                )

                next_section = (
                    sections[section_index + 1]
                    if section_index + 1 < len(sections)
                    else None
                )
                between_section_rest = self.get_between_section_rest_seconds(
                    previous_section=section,
                    next_section=next_section,
                )

                if between_section_rest > 0 and next_section is not None:
                    next_exercises = next_section.get("exercises", [])
                    next_name = (
                        next_exercises[0].get("name", next_section.get("name", "Section"))
                        if next_exercises
                        else next_section.get("name", "Section")
                    )
                    expanded.append(
                        self.make_rest_step(
                            duration_sec=between_section_rest,
                            detail=(
                                "Recover before the next block. "
                                f"Next: {next_name}"
                            ),
                            section_name="Between blocks",
                            round_index=1,
                            round_total=1,
                            workout_round=workout_round,
                            workout_rounds=workout_rounds,
                            title="Rest",
                        )
                    )

        return self.add_prepare_steps(expanded)

    def add_prepare_steps(self, steps):
        expanded = []

        for step in steps:
            if self.needs_prepare_step(previous_step=expanded[-1] if expanded else None, step=step):
                expanded.append(
                    self.make_rest_step(
                        duration_sec=2,
                        title="Prepare",
                        detail=f"Get ready for: {step.get('title', 'Exercise')}",
                        section_name=step.get("section_name", ""),
                        round_index=step.get("round_index", 1),
                        round_total=step.get("round_total", 1),
                        workout_round=step.get("workout_round", 1),
                        workout_rounds=step.get("workout_rounds", 1),
                    )
                )

            expanded.append(step)

        return expanded

    @staticmethod
    def needs_prepare_step(previous_step, step):
        if previous_step is None:
            return False

        if not step.get("is_exercise"):
            return False

        return not previous_step.get("is_rest", False)

    @staticmethod
    def get_between_section_rest_seconds(previous_section, next_section):
        if previous_section is None or next_section is None:
            return 0

        previous_rest = int(previous_section.get("rest_between_rounds_sec", 0) or 0)
        next_rest = int(next_section.get("rest_between_rounds_sec", 0) or 0)
        return min(previous_rest, next_rest)

    def expand_section(self, section, workout_round, workout_rounds):
        expanded = []

        section_name = section.get("name", "Section")
        section_type = section.get("type")
        exercises = section.get("exercises", [])

        if section_type not in ("sequence", "circuit"):
            raise ValueError(
                f"Section '{section_name}' has invalid type: {section_type}"
            )

        if not exercises:
            raise ValueError(f"Section '{section_name}' has no exercises.")

        rounds = int(section.get("rounds", 1 if section_type == "sequence" else 1))
        if rounds < 1:
            raise ValueError(f"Section '{section_name}' must have at least 1 round.")

        rest_between_exercises = int(section.get("rest_between_exercises_sec", 0))
        rest_between_rounds = int(section.get("rest_between_rounds_sec", 0))

        for round_index in range(1, rounds + 1):
            for exercise_index, exercise in enumerate(exercises):
                expanded.append(
                    self.expand_exercise(
                        exercise,
                        section_name=section_name,
                        section_type=section_type,
                        round_index=round_index,
                        round_total=rounds,
                        workout_round=workout_round,
                        workout_rounds=workout_rounds,
                    )
                )

                is_last_exercise = exercise_index == len(exercises) - 1
                is_last_round = round_index == rounds

                if (
                    section_type == "circuit"
                    and not is_last_exercise
                    and rest_between_exercises > 0
                ):
                    next_exercise = exercises[exercise_index + 1]
                    expanded.append(
                        self.make_rest_step(
                            duration_sec=rest_between_exercises,
                            detail=(
                                f"Recover briefly. Next: {next_exercise.get('name', 'Exercise')}"
                            ),
                            section_name=section_name,
                            round_index=round_index,
                            round_total=rounds,
                            workout_round=workout_round,
                            workout_rounds=workout_rounds,
                        )
                    )

                if (
                    section_type == "circuit"
                    and is_last_exercise
                    and not is_last_round
                    and rest_between_rounds > 0
                ):
                    next_round_exercise = exercises[0]
                    expanded.append(
                        self.make_rest_step(
                            duration_sec=rest_between_rounds,
                            title=f"Rest before round {round_index + 1}",
                            detail=(
                                "Recover before the next round. "
                                f"Next: {next_round_exercise.get('name', 'Exercise')}"
                            ),
                            section_name=section_name,
                            round_index=round_index,
                            round_total=rounds,
                            workout_round=workout_round,
                            workout_rounds=workout_rounds,
                        )
                    )

        return expanded

    def expand_exercise(
        self,
        exercise,
        section_name,
        section_type,
        round_index,
        round_total,
        workout_round,
        workout_rounds,
    ):
        exercise_name = exercise.get("name", "Exercise")
        mode = exercise.get("mode")
        description = exercise.get("description", "")

        if mode == "time":
            duration_sec = int(exercise.get("duration_sec", 0))
            if duration_sec <= 0:
                raise ValueError(
                    f"Timed exercise '{exercise_name}' in section '{section_name}' "
                    "must have a positive 'duration_sec'."
                )

            detail_parts = [description] if description else []
            detail_parts.append(f"Duration: {self.format_time(duration_sec)}")
            return {
                "title": exercise_name,
                "detail": "\n".join(detail_parts),
                "type": "timed",
                "seconds": duration_sec,
                "is_exercise": True,
                "section_name": section_name,
                "section_type": section_type,
                "round_index": round_index,
                "round_total": round_total,
                "workout_round": workout_round,
                "workout_rounds": workout_rounds,
            }

        if mode == "reps":
            repetitions = int(exercise.get("repetitions", 0))
            if repetitions <= 0:
                raise ValueError(
                    f"Rep exercise '{exercise_name}' in section '{section_name}' "
                    "must have a positive 'repetitions'."
                )

            detail_parts = [description] if description else []
            detail_parts.append(f"Repetitions: {repetitions}")
            return {
                "title": exercise_name,
                "detail": "\n".join(detail_parts),
                "type": "manual",
                "is_exercise": True,
                "section_name": section_name,
                "section_type": section_type,
                "round_index": round_index,
                "round_total": round_total,
                "workout_round": workout_round,
                "workout_rounds": workout_rounds,
            }

        raise ValueError(
            f"Exercise '{exercise_name}' in section '{section_name}' has invalid mode: {mode}"
        )

    def make_rest_step(
        self,
        duration_sec,
        detail,
        section_name,
        round_index,
        round_total,
        workout_round,
        workout_rounds,
        title="Rest",
    ):
        return {
            "title": title,
            "detail": detail,
            "type": "timed",
            "seconds": int(duration_sec),
            "section_name": section_name,
            "section_type": "rest",
            "round_index": round_index,
            "round_total": round_total,
            "workout_round": workout_round,
            "workout_rounds": workout_rounds,
            "is_rest": True,
        }

    @staticmethod
    def build_context_text(step):
        section_name = step.get("section_name", "")
        round_index = step.get("round_index", 1)
        round_total = step.get("round_total", 1)
        workout_round = step.get("workout_round", 1)
        workout_rounds = step.get("workout_rounds", 1)

        context_parts = []
        if section_name:
            if round_total > 1:
                context_parts.append(f"{section_name} - round {round_index}/{round_total}")
            else:
                context_parts.append(section_name)

        if workout_rounds > 1:
            context_parts.append(f"Workout round {workout_round}/{workout_rounds}")

        return "\n".join(context_parts)

    def show_step(self):
        if self.after_id is not None:
            self.root.after_cancel(self.after_id)
            self.after_id = None

        self.paused = False

        if self.current_step >= len(self.steps):
            self.title_label.config(text="Workout complete")
            self.detail_label.config(text="Nice.")
            self.timer_label.config(text="")
            self.progress_label.config(text="")
            self.up_next_label.config(text="Up next: -")
            self.play_alert_sound(repeat=4)
            return

        step = self.steps[self.current_step]

        title = step.get("title", "")
        detail = step.get("detail", "")
        context_text = self.build_context_text(step)

        self.title_label.config(text=title)
        detail_lines = [value for value in (detail, context_text) if value]
        self.detail_label.config(text="\n\n".join(detail_lines))
        self.progress_label.config(
            text=f"Step {self.current_step + 1} / {len(self.steps)}"
        )
        self.up_next_label.config(text=f"Up next: {self.next_step_title()}")

        if step["type"] == "timed":
            self.remaining = (
                int(step.get("hours", 0)) * 3600
                + int(step.get("minutes", 0)) * 60
                + int(step.get("seconds", 0))
            )
            self.update_timer()
        else:
            self.timer_label.config(text="Press SPACE when done")
            self.play_alert_sound()

    @staticmethod
    def format_time(total_seconds):
        total_seconds = max(0, int(total_seconds))
        h = total_seconds // 3600
        m = (total_seconds % 3600) // 60
        s = total_seconds % 60
        if h > 0:
            return f"{h}:{m:02d}:{s:02d}"
        return f"{m}:{s:02d}"

    def update_timer(self):
        if self.paused:
            self.timer_label.config(text=f"Paused — {self.format_time(self.remaining)}")
            return

        self.timer_label.config(text=self.format_time(self.remaining))

        if self.remaining <= 0:
            self.play_alert_sound()
            self.current_step += 1
            self.show_step()
        else:
            self.remaining -= 1
            self.after_id = self.root.after(1000, self.update_timer)

    def on_space(self, event):
        if not self.workout_started:
            self.workout_started = True
            self.show_step()
            return

        if self.current_step >= len(self.steps):
            return

        step = self.steps[self.current_step]
        if step["type"] == "manual":
            self.current_step += 1
            self.show_step()

    def toggle_pause(self, event=None):
        if not self.workout_started:
            return

        if self.current_step >= len(self.steps):
            return

        step = self.steps[self.current_step]
        if step["type"] != "timed":
            return

        self.paused = not self.paused
        if not self.paused:
            self.update_timer()
        else:
            if self.after_id is not None:
                self.root.after_cancel(self.after_id)
                self.after_id = None
            self.timer_label.config(text=f"Paused — {self.format_time(self.remaining)}")

    def next_step(self, event=None):
        if not self.workout_started:
            return

        if self.current_step >= len(self.steps):
            return
        self.current_step += 1
        self.show_step()


def load_workout_json(filepath):
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Workout file not found: {path}")

    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("Workout JSON must contain a top-level object.")

    return data


def main():
    if len(sys.argv) != 2:
        print("Usage:")
        print("  python workout_timer.py path/to/workout.json")
        sys.exit(1)

    workout_file = sys.argv[1]
    workout = load_workout_json(workout_file)

    root = tk.Tk()
    app = WorkoutTimer(root, workout)
    root.mainloop()


if __name__ == "__main__":
    main()