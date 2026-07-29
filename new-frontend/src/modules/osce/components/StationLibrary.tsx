import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronDown, Star } from "lucide-react";
import type { OsceStation, Specialty, StationType, Difficulty } from "../types";

interface StationCardProps {
  station: OsceStation;
  onClick: (station: OsceStation) => void;
  isRecommended?: boolean;
}

function StationCard({ station, onClick, isRecommended = false }: StationCardProps) {
  const specialtyColors = {
    "Internal Medicine": "bg-blue-500/10 border-blue-200",
    "Surgery": "bg-red-500/10 border-red-200",
    "Pediatrics": "bg-green-500/10 border-green-200",
    "Obstetrics": "bg-pink-500/10 border-pink-200",
    "Psychiatry": "bg-purple-500/10 border-purple-200",
    "Emergency Medicine": "bg-orange-500/10 border-orange-200",
    "Cardiology": "bg-red-500/10 border-red-200",
    "Neurology": "bg-indigo-500/10 border-indigo-200",
    "Gastroenterology": "bg-green-500/10 border-green-200",
    "Endocrinology": "bg-amber-500/10 border-amber-200",
    "Respiratory Medicine": "bg-cyan-500/10 border-cyan-200",
    "Oncology": "bg-rose-500/10 border-rose-200",
    "Rheumatology": "bg-fuchsia-500/10 border-fuchsia-200",
    "Infectious Disease": "bg-lime-500/10 border-lime-200",
    "Geriatrics": "bg-slate-500/10 border-slate-200",
    "Ophthalmology": "bg-violet-500/10 border-violet-200",
    "ENT": "bg-cyan-500/10 border-cyan-200",
    "Orthopedics": "bg-emerald-500/10 border-emerald-200",
    "Urology": "bg-teal-500/10 border-teal-200",
    "Nephrology": "bg-sky-500/10 border-sky-200",
  };

  const typeIcons = {
    History: "📋",
    Examination: "💉",
    Counseling: "💬",
    Communication: "🗣️",
    Interpretation: "📊",
    Emergency: "🚨",
  };

  const difficultyColors = {
    Beginner: "bg-green-100 text-green-700",
    Intermediate: "bg-yellow-100 text-yellow-700",
    Advanced: "bg-orange-100 text-orange-700",
    "Residency level": "bg-red-100 text-red-700",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(station)}
      className={`cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg ${
        isRecommended ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20" 
        : "border-gray-200 hover:border-[var(--accent-primary)]"
      } ${specialtyColors[station.specialty]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{station.title}</h3>
        {isRecommended && <Star className="w-5 h-5 text-[var(--accent-primary)] fill-current" />}
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{station.specialty}</span>
        <span className="text-sm">{typeIcons[station.type]}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {station.skills.slice(0, 2).map((skill) => (
            <span key={skill} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
              {skill}
            </span>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${difficultyColors[station.difficulty]}`}>
            {station.difficulty}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">⏱ {station.durationMinutes}m</span>
        </div>
      </div>

      <button 
        onClick={() => onClick(station)}
        className="mt-4 w-full py-2 px-4 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Start Station
      </button>
    </motion.div>
  );
}

interface FilterBadgeProps {
  label: string;
  onClose?: () => void;
}

function FilterBadge({ label, onClose }: FilterBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      {onClose && (
        <button onClick={onClose} className="hover:text-red-500">
          ✕
        </button>
      )}
    </div>
  );
}

export function StationLibrary({ 
  stations, 
  filters, 
  onFilterChange, 
  onSelectStation 
}: { 
  stations: OsceStation[];
  filters: { specialty: Specialty | "all"; type: StationType | "all"; difficulty: Difficulty | "all"; searchQuery: string };
  onFilterChange: (filters: Partial<{ specialty: Specialty | "all"; type: StationType | "all"; difficulty: Difficulty | "all"; searchQuery: string }>) => void;
  onSelectStation: (station: OsceStation) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);

  const activeFilters = Object.entries(filters).filter(([_, v]) => v !== "all" && v !== "");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onFilterChange({ searchQuery: value });
  };

  const clearSearch = () => {
    setSearchQuery("");
    onFilterChange({ searchQuery: "" });
  };

  const uniqueSpecialties = [...new Set(stations.map(s => s.specialty))];
  const uniqueTypes = [...new Set(stations.map(s => s.type))];
  const uniqueDifficulties: (Difficulty | "Residency level")[] = ["Beginner", "Intermediate", "Advanced", "Residency level"];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Station Library</h2>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search stations..."
            className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent bg-white dark:bg-gray-900"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Filter className="w-4 h-4" />
          Filter by {activeFilters.length > 0 ? `${activeFilters.length} active` : "All"}
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.specialty !== "all" && <FilterBadge label={`Specialty: ${filters.specialty}`} />}
          {filters.type !== "all" && <FilterBadge label={`Type: ${filters.type}`} />}
          {filters.difficulty !== "all" && <FilterBadge label={`Difficulty: ${filters.difficulty}`} />}
          <FilterBadge label="Clear all" onClose={() => onFilterChange({ specialty: "all", type: "all", difficulty: "all", searchQuery: "" })} />
        </div>
      )}

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Specialty</h4>
                <select
                  value={filters.specialty}
                  onChange={(e) => onFilterChange({ specialty: e.target.value as Specialty | "all" })}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900"
                >
                  <option value="all">All Specialties</option>
                  {uniqueSpecialties.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Type</h4>
                <select
                  value={filters.type}
                  onChange={(e) => onFilterChange({ type: e.target.value as StationType | "all" })}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900"
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Difficulty</h4>
                <select
                  value={filters.difficulty}
                  onChange={(e) => onFilterChange({ difficulty: e.target.value as Difficulty | "all" })}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900"
                >
                  <option value="all">All Levels</option>
                  {uniqueDifficulties.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations.map(station => (
          <StationCard
            key={station.id}
            station={station}
            onClick={onSelectStation}
          />
        ))}
      </div>

      {stations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No stations found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}