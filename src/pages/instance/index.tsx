import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import { useLiveData } from "../../contexts/LiveDataContext";
import type { Record as LiveRecord } from "../../types/LiveData";
import { useNodeList } from "@/contexts/NodeListContext";
import { liveDataToRecords } from "@/utils/RecordHelper";
import { formatDateTimeWithTz, formatRegionCode } from "@/utils/statusFormat";
import { formatBytes, formatUptime } from "@/utils/unitHelper";
import { api } from "@/lib/http";
import KeyValueRow from "./components/KeyValueRow";
import LoadChart from "./LoadChart";

const dash = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const regionCode = formatRegionCode;

const bytesOrDash = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? formatBytes(value)
    : "—";

const percentOf = (used?: number | null, total?: number | null) =>
  typeof used === "number" &&
  Number.isFinite(used) &&
  typeof total === "number" &&
  Number.isFinite(total) &&
  total > 0
    ? (used / total) * 100
    : undefined;

export default function InstancePage() {
  const { t } = useTranslation();
  const { onRefresh, live_data } = useLiveData();
  const { uuid } = useParams<{ uuid: string }>();
  const reducedMotion = useReducedMotion();

  const [recentState, setRecentState] = useState<{ uuid: string | null; list: LiveRecord[] }>({
    uuid: null,
    list: [],
  });
  const recent = recentState.list;
  const recentLoading = !!uuid && recentState.uuid !== uuid;
  const [chartRealtimeActive, setChartRealtimeActive] = useState(true);
  const [copiedUuid, setCopiedUuid] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const { nodeList } = useNodeList();
  const length = 30 * 5;

  const node = nodeList?.find((item) => item.uuid === uuid);
  const liveRecord = uuid ? live_data?.data.data[uuid] : undefined;
  const isOnline = !!uuid && (live_data?.data.online ?? []).includes(uuid);
  const chartRecords = useMemo(
    () => liveDataToRecords(uuid ?? "", recent),
    [uuid, recent],
  );
  const handleChartRealtimeChange = useCallback((active: boolean) => {
    setChartRealtimeActive(active);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!uuid) {
      setRecentState({ uuid: null, list: [] });
      return;
    }

    const controller = new AbortController();

    api
      .get<{ data?: LiveRecord[] } | null>(`/api/recent/${uuid}`, {
        signal: controller.signal,
        expectSuccess: false,
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setRecentState({ uuid, list: (data?.data ?? []).slice(-length) });
        }
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch recent data:", err);
          setRecentState({ uuid, list: [] });
        }
      });

    return () => controller.abort();
  }, [uuid, length]);

  // 动态追加数据
  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid || !chartRealtimeActive) return;
      const data = resp.data.data[uuid];
      if (!data) return;

      setRecentState((state) => {
        if (state.uuid !== uuid) return state;
        const prev = state.list;
        const newRecord: LiveRecord = data;
        const exists = prev.some(
          (item) => item.updated_at === newRecord.updated_at,
        );
        if (exists) {
          return state;
        }

        return { uuid, list: [...prev, newRecord].slice(-length) };
      });
    });

    return unsubscribe;
  }, [chartRealtimeActive, length, onRefresh, uuid]);

  const cpuUsage = liveRecord?.cpu.usage;
  const cpuValue =
    typeof cpuUsage === "number" && Number.isFinite(cpuUsage)
      ? cpuUsage
      : null;
  const cpuDanger = cpuValue !== null && cpuValue >= 80;

  const memUsed = liveRecord?.ram.used;
  const swapUsed = liveRecord?.swap.used;
  const diskUsed = liveRecord?.disk.used;
  const memPercent = percentOf(memUsed, node?.mem_total);
  const swapPercent = percentOf(swapUsed, node?.swap_total);
  const diskPercent = percentOf(diskUsed, node?.disk_total);

  const loadText = liveRecord
    ? `${liveRecord.load.load1.toFixed(2)} / ${liveRecord.load.load5.toFixed(2)} / ${liveRecord.load.load15.toFixed(2)}`
    : "—";
  const networkText = liveRecord
    ? `↓ ${bytesOrDash(liveRecord.network.down)}/s  ↑ ${bytesOrDash(liveRecord.network.up)}/s`
    : "—";
  const trafficText = liveRecord
    ? `↓ ${bytesOrDash(liveRecord.network.totalDown)}  ↑ ${bytesOrDash(liveRecord.network.totalUp)}`
    : "—";
  const uptimeText = liveRecord?.uptime
    ? formatUptime(liveRecord.uptime, t)
    : "—";
  const lastUpdated = liveRecord?.updated_at || node?.updated_at;
  const lastUpdatedText = lastUpdated
    ? formatDateTimeWithTz(lastUpdated)
    : "—";

  const copyUuid = () => {
    if (!uuid) return;
    void navigator.clipboard?.writeText(uuid);
    setCopiedUuid(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedUuid(false);
      copyTimerRef.current = null;
    }, 1500);
  };

  return (
    <div className="km-page-instance w-full">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="text-[13px] font-medium leading-none text-[color:var(--km-instance-muted)] transition-colors hover:text-black dark:hover:text-[#F2F2F2]"
        >
          ← {t("common.returnToOverview")}
        </Link>
        <div
          className="flex items-center gap-2 font-sans text-[13px] font-medium leading-none"
          style={{ color: "var(--km-instance-muted)" }}
        >
          <span
            className={`${isOnline ? "status-square-online" : "status-square-offline"} shrink-0`}
          />
          <span>{isOnline ? t("status.online") : t("status.offline")}</span>
          <span>·</span>
          <span className="uppercase tracking-[0.06em]">
            {regionCode(node?.region)}
          </span>
        </div>
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.12, ease: "easeOut" }}
      >
        <header className="mt-4 border-b border-[color:var(--km-instance-hairline)] pb-6">
          <h1 className="font-display break-words text-[48px] font-bold leading-[0.95] tracking-[-0.04em] text-black sm:text-[clamp(56px,8vw,104px)] dark:text-[#F2F2F2]">
            {dash(node?.name)}
          </h1>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--km-instance-muted)]">
              CPU · {t("common.current")}
            </div>
            <div className="font-display mt-3 flex items-start leading-[0.9] tabular-nums">
              <span
                className="text-[clamp(80px,11vw,144px)] font-bold tracking-[-0.05em]"
                style={{ color: cpuDanger ? "var(--km-instance-alert)" : "var(--km-instance-rule)" }}
              >
                {cpuValue === null ? "—" : cpuValue.toFixed(1)}
              </span>
              {cpuValue !== null && (
                <span
                  className="text-[clamp(80px,11vw,144px)] font-light tracking-[-0.05em]"
                  style={{ color: "var(--km-instance-muted)" }}
                >
                  %
                </span>
              )}
            </div>
            <div className="mt-3 text-[13px]" style={{ color: "var(--km-instance-muted)" }}>
              {node ? `${node.cpu_name} · x${node.cpu_cores}` : "—"}
            </div>

            <div className="mt-6 border-t border-[color:var(--km-instance-hairline)]">
              <KeyValueRow
                label={t("nodeCard.ram")}
                value={`${bytesOrDash(memUsed)} / ${bytesOrDash(node?.mem_total)}`}
                progress={memPercent}
              />
              <KeyValueRow
                label={t("nodeCard.swap")}
                value={`${bytesOrDash(swapUsed)} / ${bytesOrDash(node?.swap_total)}`}
                progress={swapPercent}
              />
              <KeyValueRow
                label={t("nodeCard.disk")}
                value={`${bytesOrDash(diskUsed)} / ${bytesOrDash(node?.disk_total)}`}
                progress={diskPercent}
              />
              <KeyValueRow label={t("nodeCard.networkSpeed")} value={networkText} />
              <KeyValueRow label={t("nodeCard.load")} value={loadText} />
              <KeyValueRow label={t("chart.process")} value={dash(liveRecord?.process)} />
              <KeyValueRow label={t("nodeCard.uptime")} value={uptimeText} />
              <KeyValueRow label={t("nodeCard.os")} value={dash(node?.os)} breakAll />
              <KeyValueRow
                label={t("nodeCard.kernelVersion")}
                value={dash(node?.kernel_version)}
                breakAll
              />
              <KeyValueRow
                label={t("admin.nodeDetail.arch")}
                value={`${dash(node?.arch)} / ${dash(node?.virtualization)}`}
              />
              <KeyValueRow label="GPU" value={dash(node?.gpu_name)} breakAll />
              <KeyValueRow label={t("nodeCard.totalTraffic")} value={trafficText} />
              <KeyValueRow
                label={t("nodeCard.last_updated")}
                value={lastUpdatedText}
                last
              />
            </div>
            <div className="border-b border-[color:var(--km-instance-hairline)]" />
          </div>

          <div className="lg:col-span-7">
            <LoadChart
              data={chartRecords}
              realtimeLoading={recentLoading}
              onRealtimeActiveChange={handleChartRealtimeChange}
            />
          </div>
        </div>

        {uuid && (
          <div className="mt-10 pt-2">
            <button
              type="button"
              onClick={copyUuid}
              className="km-uuid block max-w-full cursor-pointer truncate whitespace-nowrap border-0 bg-transparent p-0 text-left text-[11px] leading-none text-[#6B6B6B] transition-colors hover:text-black dark:text-[#8C8C8C] dark:hover:text-[#F2F2F2]"
            >
              {copiedUuid ? "COPIED" : uuid}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
