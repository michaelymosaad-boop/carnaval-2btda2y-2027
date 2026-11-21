import {
  computeTeamScoreboard,
  type Servant,
  type PointsLedgerEntry,
  type GateCheckinRecord,
  type KidParticipant,
  type CodedTeamItem,
} from '@/lib/carnival-store';

export interface RealActivityPointItem {
  id: string;
  title: string;
  category: string;
  points: number;
  time?: string;
  scopeLabel?: string;
}

export interface RealProfilePointsSummary {
  isKid: boolean;
  matchedKid: KidParticipant | null;
  totalPoints: number;
  breakdown: RealActivityPointItem[];
  gateCheckin: GateCheckinRecord | null;
  teamName: string | null;
  teamRank: number | null;
  teamTotalPoints: number | null;
  servantStats: {
    gateScansRecorded: number;
    pointsEntriesRecorded: number;
    kidsInServiceCount: number;
  };
}

const SOURCE_CATEGORY_LABELS: Record<PointsLedgerEntry['source'], string> = {
  gate: 'حضور البوابة',
  early_bonus: 'بونص الحضور المبكر',
  round: 'جولة ومحطة',
  team_spirit: 'روح الفريق والانضباط',
  correction: 'قيد تصحيحي معتمد',
};

export function computeRealProfilePoints(params: {
  servant: Servant | null;
  pointsLedger: PointsLedgerEntry[];
  gateCheckins: GateCheckinRecord[];
  kids: KidParticipant[];
  codedTeams: CodedTeamItem[];
}): RealProfilePointsSummary {
  const { servant, pointsLedger, gateCheckins, kids, codedTeams } = params;

  if (!servant) {
    return {
      isKid: false,
      matchedKid: null,
      totalPoints: 0,
      breakdown: [],
      gateCheckin: null,
      teamName: null,
      teamRank: null,
      teamTotalPoints: null,
      servantStats: {
        gateScansRecorded: 0,
        pointsEntriesRecorded: 0,
        kidsInServiceCount: 0,
      },
    };
  }

  const matchedKid = kids.find((k) => k.id === servant.id) || null;
  const isKid = Boolean(matchedKid);

  const gateCheckin =
    gateCheckins.find(
      (g) =>
        g.subject_id === servant.id ||
        (servant.qr_token && g.qr_token.toUpperCase() === servant.qr_token.toUpperCase())
    ) || null;

  const breakdown: RealActivityPointItem[] = [];

  if (isKid && matchedKid) {
    const matchedEntries = pointsLedger.filter(
      (entry) =>
        entry.target_id === matchedKid.id ||
        (matchedKid.team_name &&
          entry.team_name === matchedKid.team_name &&
          entry.target_type === 'team')
    );

    const hasGateEntryForKid = matchedEntries.some(
      (e) => e.target_id === matchedKid.id && e.source === 'gate'
    );

    for (const entry of matchedEntries) {
      breakdown.push({
        id: entry.id,
        title: entry.round_title || entry.reason || SOURCE_CATEGORY_LABELS[entry.source],
        category: entry.axis_name || SOURCE_CATEGORY_LABELS[entry.source],
        points: entry.points,
        time: entry.created_at,
        scopeLabel: entry.target_type === 'team' ? `فريق ${entry.team_name}` : 'نقاط شخصية',
      });
    }

    if (gateCheckin && !hasGateEntryForKid) {
      if (gateCheckin.gate_points_awarded > 0) {
        breakdown.push({
          id: `gate-${gateCheckin.id}`,
          title: 'تسجيل حضور البوابة الميدانية',
          category: 'حضور البوابة',
          points: gateCheckin.gate_points_awarded,
          time: gateCheckin.checked_in_local_time || gateCheckin.checked_in_at,
          scopeLabel: 'نقاط شخصية',
        });
      }
      if (gateCheckin.early_bonus_awarded > 0) {
        breakdown.push({
          id: `early-${gateCheckin.id}`,
          title: 'مكافأة الحضور المبكر قبل الموعد',
          category: 'بونص الحضور المبكر',
          points: gateCheckin.early_bonus_awarded,
          time: gateCheckin.checked_in_local_time || gateCheckin.checked_in_at,
          scopeLabel: 'نقاط شخصية',
        });
      }
    }
  } else {
    const servantEntries = pointsLedger.filter(
      (entry) => entry.target_type === 'servant' && entry.target_id === servant.id
    );

    const hasGateEntryForServant = servantEntries.some((e) => e.source === 'gate');

    for (const entry of servantEntries) {
      breakdown.push({
        id: entry.id,
        title: entry.round_title || entry.reason || SOURCE_CATEGORY_LABELS[entry.source],
        category: entry.axis_name || SOURCE_CATEGORY_LABELS[entry.source],
        points: entry.points,
        time: entry.created_at,
        scopeLabel: entry.team_name ? `فريق ${entry.team_name}` : 'رصيد الخادم',
      });
    }

    if (gateCheckin && !hasGateEntryForServant) {
      if (gateCheckin.gate_points_awarded > 0) {
        breakdown.push({
          id: `gate-${gateCheckin.id}`,
          title: 'تسجيل حضور البوابة الميدانية',
          category: 'حضور البوابة',
          points: gateCheckin.gate_points_awarded,
          time: gateCheckin.checked_in_local_time || gateCheckin.checked_in_at,
          scopeLabel: 'حضور شخصي',
        });
      }
      if (gateCheckin.early_bonus_awarded > 0) {
        breakdown.push({
          id: `early-${gateCheckin.id}`,
          title: 'مكافأة الحضور المبكر قبل الموعد',
          category: 'بونص الحضور المبكر',
          points: gateCheckin.early_bonus_awarded,
          time: gateCheckin.checked_in_local_time || gateCheckin.checked_in_at,
          scopeLabel: 'حضور شخصي',
        });
      }
    }
  }

  breakdown.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  const totalPoints = breakdown.reduce((acc, item) => acc + item.points, 0);

  let teamName: string | null = matchedKid?.team_name || gateCheckin?.team_name || null;
  let teamRank: number | null = null;
  let teamTotalPoints: number | null = null;

  if (teamName) {
    const board = computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins);
    const matchedTeam = board.find((t) => t.team_name === teamName);
    if (matchedTeam) {
      teamRank = matchedTeam.rank;
      teamTotalPoints = matchedTeam.total_points;
    } else {
      teamName = matchedKid?.team_name || null;
    }
  }

  const gateScansRecorded = gateCheckins.filter(
    (g) => g.recorded_by_servant_id === servant.id
  ).length;
  const pointsEntriesRecorded = pointsLedger.filter(
    (e) =>
      e.recorded_by_servant_id === servant.id &&
      e.source !== 'gate' &&
      e.source !== 'early_bonus'
  ).length;
  const kidsInServiceCount = servant.service_id
    ? kids.filter((k) => k.service_id === servant.service_id).length
    : 0;

  return {
    isKid,
    matchedKid,
    totalPoints,
    breakdown,
    gateCheckin,
    teamName,
    teamRank,
    teamTotalPoints,
    servantStats: {
      gateScansRecorded,
      pointsEntriesRecorded,
      kidsInServiceCount,
    },
  };
}
