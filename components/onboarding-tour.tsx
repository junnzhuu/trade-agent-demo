"use client";

import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  type OnboardingPlacement,
  type OnboardingStep,
} from "@/lib/onboarding-tour";

type TargetRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type BubbleLayout = {
  top: number;
  left: number;
  placement: OnboardingPlacement;
};

const EDGE_GAP = 16;
const TARGET_GAP = 18;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function oppositePlacement(placement: OnboardingPlacement) {
  if (placement === "top") return "bottom";
  if (placement === "bottom") return "top";
  if (placement === "left") return "right";
  if (placement === "right") return "left";
  return "center";
}

function placeBubble(
  placement: OnboardingPlacement,
  target: TargetRect,
  bubbleWidth: number,
  bubbleHeight: number,
) {
  if (placement === "top") {
    return {
      top: target.top - bubbleHeight - TARGET_GAP,
      left: target.left + target.width / 2 - bubbleWidth / 2,
    };
  }
  if (placement === "bottom") {
    return {
      top: target.bottom + TARGET_GAP,
      left: target.left + target.width / 2 - bubbleWidth / 2,
    };
  }
  if (placement === "left") {
    return {
      top: target.top + target.height / 2 - bubbleHeight / 2,
      left: target.left - bubbleWidth - TARGET_GAP,
    };
  }
  return {
    top: target.top + target.height / 2 - bubbleHeight / 2,
    left: target.right + TARGET_GAP,
  };
}

function calculateBubbleLayout(
  preferredPlacement: OnboardingPlacement,
  target: TargetRect | null,
  bubbleWidth: number,
  bubbleHeight: number,
): BubbleLayout {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!target || preferredPlacement === "center" || viewportWidth <= 760) {
    return {
      top: clamp(
        (viewportHeight - bubbleHeight) / 2,
        EDGE_GAP,
        viewportHeight - bubbleHeight - EDGE_GAP,
      ),
      left: clamp(
        (viewportWidth - bubbleWidth) / 2,
        EDGE_GAP,
        viewportWidth - bubbleWidth - EDGE_GAP,
      ),
      placement: "center",
    };
  }

  let placement: OnboardingPlacement = preferredPlacement;
  let position = placeBubble(placement, target, bubbleWidth, bubbleHeight);
  const exceedsViewport =
    position.top < EDGE_GAP ||
    position.left < EDGE_GAP ||
    position.top + bubbleHeight > viewportHeight - EDGE_GAP ||
    position.left + bubbleWidth > viewportWidth - EDGE_GAP;

  if (exceedsViewport) {
    const opposite = oppositePlacement(preferredPlacement);
    const oppositePosition = placeBubble(
      opposite,
      target,
      bubbleWidth,
      bubbleHeight,
    );
    const oppositeFits =
      oppositePosition.top >= EDGE_GAP &&
      oppositePosition.left >= EDGE_GAP &&
      oppositePosition.top + bubbleHeight <= viewportHeight - EDGE_GAP &&
      oppositePosition.left + bubbleWidth <= viewportWidth - EDGE_GAP;
    if (oppositeFits) {
      placement = opposite;
      position = oppositePosition;
    }
  }

  return {
    top: clamp(
      position.top,
      EDGE_GAP,
      viewportHeight - bubbleHeight - EDGE_GAP,
    ),
    left: clamp(
      position.left,
      EDGE_GAP,
      viewportWidth - bubbleWidth - EDGE_GAP,
    ),
    placement,
  };
}

export function OnboardingTour({
  step,
  stepIndex,
  stepCount,
  onBack,
  onNext,
  onSkip,
}: {
  step: OnboardingStep;
  stepIndex: number;
  stepCount: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const bubbleRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [bubbleLayout, setBubbleLayout] = useState<BubbleLayout>({
    top: 24,
    left: 24,
    placement: "center",
  });

  const updateLayout = useCallback(() => {
    const target = step.targetId
      ? document.querySelector<HTMLElement>(
          `[data-tour-id="${step.targetId}"]`,
        )
      : null;
    const rect = target?.getBoundingClientRect();
    const nextTargetRect = rect
      ? {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }
      : null;
    const bubbleWidth = bubbleRef.current?.offsetWidth ?? 360;
    const bubbleHeight = bubbleRef.current?.offsetHeight ?? 230;
    setTargetRect(nextTargetRect);
    setBubbleLayout(
      calculateBubbleLayout(
        step.placement,
        nextTargetRect,
        bubbleWidth,
        bubbleHeight,
      ),
    );
  }, [step]);

  useLayoutEffect(() => {
    const target = step.targetId
      ? document.querySelector<HTMLElement>(
          `[data-tour-id="${step.targetId}"]`,
        )
      : null;
    target?.scrollIntoView({ block: "center", inline: "nearest" });
    const frame = window.requestAnimationFrame(updateLayout);
    const settleFrame = window.setTimeout(updateLayout, 180);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);
    const resizeObserver = new ResizeObserver(updateLayout);
    if (target) resizeObserver.observe(target);
    if (bubbleRef.current) resizeObserver.observe(bubbleRef.current);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleFrame);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
      resizeObserver.disconnect();
    };
  }, [step, updateLayout]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onSkip();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button:not([disabled])",
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const spotlightStyle = targetRect
    ? ({
        top: targetRect.top - 7,
        left: targetRect.left - 7,
        width: targetRect.width + 14,
        height: targetRect.height + 14,
      } satisfies CSSProperties)
    : undefined;
  const bubbleStyle = {
    top: bubbleLayout.top,
    left: bubbleLayout.left,
  } satisfies CSSProperties;
  const isLastStep = stepIndex === stepCount - 1;

  return (
    <div className="onboarding-tour-layer">
      <div aria-hidden="true" className="onboarding-interaction-blocker" />
      {targetRect ? (
        <div
          aria-hidden="true"
          className="onboarding-spotlight"
          style={spotlightStyle}
        />
      ) : (
        <div aria-hidden="true" className="onboarding-backdrop" />
      )}
      <section
        aria-labelledby="onboarding-title"
        aria-modal="true"
        className="onboarding-bubble"
        data-placement={bubbleLayout.placement}
        onKeyDown={handleKeyDown}
        ref={bubbleRef}
        role="dialog"
        style={bubbleStyle}
      >
        <header className="onboarding-bubble-header">
          <span>
            <Sparkles aria-hidden="true" size={14} />
            功能导览
          </span>
          <strong>
            {stepIndex + 1} / {stepCount}
          </strong>
        </header>
        <div
          aria-hidden="true"
          className="onboarding-progress"
          style={{ "--tour-progress": `${((stepIndex + 1) / stepCount) * 100}%` } as CSSProperties}
        />
        <h2 id="onboarding-title" ref={headingRef} tabIndex={-1}>
          {step.title}
        </h2>
        <p>{step.description}</p>
        <footer className="onboarding-actions">
          <button className="onboarding-skip" onClick={onSkip} type="button">
            跳过全部
          </button>
          <span>
            {stepIndex > 0 ? (
              <button onClick={onBack} type="button">
                <ChevronLeft aria-hidden="true" size={15} />
                上一步
              </button>
            ) : null}
            <button className="onboarding-next" onClick={onNext} type="button">
              {isLastStep ? "完成指引" : "下一步"}
              {!isLastStep ? (
                <ChevronRight aria-hidden="true" size={15} />
              ) : null}
            </button>
          </span>
        </footer>
      </section>
    </div>
  );
}
