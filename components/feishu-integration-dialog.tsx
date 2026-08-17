"use client";

import {
  Check,
  ExternalLink,
  Info,
  Link2,
  LoaderCircle,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  completeFeishuExternalAction,
  FEISHU_INTEGRATION_STORAGE_KEY,
  FEISHU_OPEN_PLATFORM_URL,
  initialFeishuIntegrationState,
  notifyFeishuIntegrationChanged,
  parseFeishuIntegrationState,
  type FeishuExternalAction,
  type FeishuIntegrationState,
} from "@/lib/feishu-integration";

type FeishuIntegrationDialogProps = {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
};

export function FeishuIntegrationDialog({
  open,
  onClose,
  onToast,
}: FeishuIntegrationDialogProps) {
  const [integration, setIntegration] = useState<FeishuIntegrationState>(() =>
    typeof window === "undefined"
      ? initialFeishuIntegrationState
      : parseFeishuIntegrationState(
          window.localStorage.getItem(FEISHU_INTEGRATION_STORAGE_KEY),
        ),
  );
  const [unlinkConfirmationOpen, setUnlinkConfirmationOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const unlinkCancelRef = useRef<HTMLButtonElement | null>(null);
  const integrationRef = useRef(integration);
  const leftPageRef = useRef(false);
  const completionTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  const persist = useCallback((next: FeishuIntegrationState) => {
    integrationRef.current = next;
    setIntegration(next);
    window.localStorage.setItem(
      FEISHU_INTEGRATION_STORAGE_KEY,
      JSON.stringify(next),
    );
    notifyFeishuIntegrationChanged();
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [open]);

  const closeDialog = () => {
    const current = integrationRef.current;
    if (current.appId && current.appSecret && current.step === 1) {
      persist({ ...current, step: 2 });
    }
    onClose();
  };

  const resolvePendingAction = useCallback(() => {
    const current = integrationRef.current;
    if (!current.pendingExternalAction) return;
    leftPageRef.current = false;
    if (completionTimerRef.current) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    const result = completeFeishuExternalAction(current);
    persist(result.state);
    if (result.toast) onToast(result.toast);
  }, [onToast, persist]);

  const completePendingAction = useCallback(() => {
    if (!leftPageRef.current) return;
    if (completionTimerRef.current) {
      window.clearTimeout(completionTimerRef.current);
    }
    completionTimerRef.current = window.setTimeout(resolvePendingAction, 650);
  }, [resolvePendingAction]);

  useEffect(() => {
    if (!open) return;

    const markPageLeft = () => {
      if (integrationRef.current.pendingExternalAction) {
        leftPageRef.current = true;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        markPageLeft();
      } else {
        completePendingAction();
      }
    };

    window.addEventListener("blur", markPageLeft);
    window.addEventListener("focus", completePendingAction);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", markPageLeft);
      window.removeEventListener("focus", completePendingAction);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [completePendingAction, open]);

  useEffect(
    () => () => {
      if (completionTimerRef.current) {
        window.clearTimeout(completionTimerRef.current);
      }
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    },
    [],
  );

  const beginExternalAction = (action: Exclude<FeishuExternalAction, null>) => {
    leftPageRef.current = false;
    persist({ ...integrationRef.current, pendingExternalAction: action });
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
    }
    fallbackTimerRef.current = window.setTimeout(resolvePendingAction, 4_000);
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (unlinkConfirmationOpen) {
        setUnlinkConfirmationOpen(false);
      } else {
        closeDialog();
      }
      return;
    }
    if (event.key !== "Tab" || unlinkConfirmationOpen) return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  const requestUnlink = () => {
    setUnlinkConfirmationOpen(true);
    requestAnimationFrame(() => unlinkCancelRef.current?.focus());
  };

  const confirmUnlink = () => {
    window.localStorage.removeItem(FEISHU_INTEGRATION_STORAGE_KEY);
    notifyFeishuIntegrationChanged();
    integrationRef.current = initialFeishuIntegrationState;
    setIntegration(initialFeishuIntegrationState);
    setUnlinkConfirmationOpen(false);
    onToast("已解除飞书集成");
  };

  if (!open) return null;

  const hasCredentials = Boolean(integration.appId && integration.appSecret);
  const waitingForCreation = integration.pendingExternalAction === "create";
  const waitingForAuthorization =
    integration.pendingExternalAction === "authorize";

  return (
    <div className="feishu-integration-layer">
      <button
        aria-label="关闭飞书集成"
        className="feishu-integration-scrim"
        onClick={closeDialog}
        type="button"
      />
      <section
        aria-labelledby="feishu-integration-title"
        aria-modal="true"
        className="feishu-integration-dialog"
        inert={unlinkConfirmationOpen ? true : undefined}
        onKeyDown={handleDialogKeyDown}
        role="dialog"
      >
        <header className="feishu-integration-header">
          <div>
            <span>飞书集成</span>
            <h2 id="feishu-integration-title">应用和授权</h2>
          </div>
          <button
            aria-label="关闭"
            onClick={closeDialog}
            ref={closeButtonRef}
            type="button"
          >
            <X size={21} />
          </button>
        </header>

        <div aria-label="授权进度" className="feishu-integration-steps">
          <div
            className={`feishu-integration-step ${integration.step === 1 ? "active" : "completed"}`}
          >
            <span>{integration.step === 2 ? <Check size={15} /> : "1"}</span>
            <strong>绑定应用</strong>
          </div>
          <span aria-hidden="true" className="feishu-integration-step-line" />
          <div
            className={`feishu-integration-step ${integration.step === 2 ? "active" : ""} ${integration.authorized ? "completed" : ""}`}
          >
            <span>{integration.authorized ? <Check size={15} /> : "2"}</span>
            <strong>完成授权</strong>
          </div>
        </div>

        {integration.step === 1 ? (
          <div className="feishu-integration-panel">
            <p className="feishu-integration-notice">
              <Info size={17} />
              授权后将自动创建飞书机器人并获取 App ID 和 App Secret
            </p>

            <button
              className="feishu-integration-primary wide"
              onClick={() =>
                persist({ ...integrationRef.current, linkRevealed: true })
              }
              type="button"
            >
              <Link2 size={17} />
              获取授权链接/二维码
            </button>

            {integration.linkRevealed ? (
              <div className="feishu-auth-entry">
                <div className="feishu-auth-qr" title="飞书开放平台创建机器人">
                  <QRCodeSVG
                    bgColor="transparent"
                    fgColor="#17191b"
                    level="M"
                    marginSize={1}
                    size={132}
                    value={FEISHU_OPEN_PLATFORM_URL}
                  />
                </div>
                <div>
                  <strong>使用飞书扫码，或通过链接继续</strong>
                  <span>完成后返回本页面，演示凭证将自动填入。</span>
                  <a
                    href={FEISHU_OPEN_PLATFORM_URL}
                    onClick={() => beginExternalAction("create")}
                    rel="noreferrer"
                    target="_blank"
                  >
                    前往飞书开放平台创建机器人
                    <ExternalLink size={15} />
                  </a>
                  {waitingForCreation ? (
                    <small>
                      <LoaderCircle size={14} />
                      等待创建结果
                    </small>
                  ) : null}
                </div>
              </div>
            ) : null}

            <footer className="feishu-integration-actions">
              <button
                className="feishu-integration-primary"
                disabled={!hasCredentials}
                onClick={() => persist({ ...integrationRef.current, step: 2 })}
                type="button"
              >
                下一步
              </button>
              <span>当前仅展示演示凭证</span>
            </footer>
          </div>
        ) : (
          <div className="feishu-integration-panel">
            <div className="feishu-integration-second-step-heading">
              <p className="feishu-integration-notice">
                <Info size={17} />
                完成授权后解锁完整能力
              </p>
              <button onClick={requestUnlink} type="button">
                解除绑定
              </button>
            </div>

            <dl className="feishu-authorization-summary">
              <div>
                <dt>App ID</dt>
                <dd>{integration.appId}</dd>
              </div>
              <div>
                <dt>授权状态</dt>
                <dd
                  className={
                    integration.authorized ? "authorized" : "pending"
                  }
                >
                  {integration.authorized ? "已授权" : "待授权"}
                </dd>
              </div>
            </dl>

            <footer className="feishu-integration-actions">
              {integration.authorized ? (
                <button
                  className="feishu-integration-primary"
                  disabled
                  type="button"
                >
                  <Check size={17} />
                  已完成授权
                </button>
              ) : (
                <a
                  className="feishu-integration-primary"
                  href={FEISHU_OPEN_PLATFORM_URL}
                  onClick={() => beginExternalAction("authorize")}
                  rel="noreferrer"
                  target="_blank"
                >
                  {waitingForAuthorization ? (
                    <LoaderCircle size={17} />
                  ) : null}
                  完成授权
                </a>
              )}
            </footer>
          </div>
        )}
      </section>

      {unlinkConfirmationOpen ? (
        <div className="feishu-unlink-layer">
          <button
            aria-label="取消解除绑定"
            className="feishu-unlink-scrim"
            onClick={() => setUnlinkConfirmationOpen(false)}
            type="button"
          />
          <section
            aria-labelledby="feishu-unlink-title"
            aria-modal="true"
            className="feishu-unlink-dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setUnlinkConfirmationOpen(false);
              }
            }}
            role="alertdialog"
          >
            <h3 id="feishu-unlink-title">解除飞书集成？</h3>
            <p>解除后将清除当前演示凭证和授权状态。</p>
            <div>
              <button
                onClick={() => setUnlinkConfirmationOpen(false)}
                ref={unlinkCancelRef}
                type="button"
              >
                取消
              </button>
              <button onClick={confirmUnlink} type="button">
                确认解除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
