import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  Zap,
  Shield,
  Globe,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';

const bentoItems = [
  {
    id: 1,
    title: 'Real-time Analytics',
    description: 'Track your progress with live insights',
    icon: BarChart3,
    color: '#3B82F6',
    size: 'col-span-2 row-span-2',
    type: 'chart',
  },
  {
    id: 2,
    title: 'Team Collaboration',
    icon: Users,
    color: '#8B5CF6',
    size: 'col-span-1 row-span-1',
    type: 'icon',
  },
  {
    id: 3,
    title: 'Lightning Fast',
    icon: Zap,
    color: '#F59E0B',
    size: 'col-span-1 row-span-1',
    type: 'icon',
  },
  {
    id: 4,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption',
    icon: Shield,
    color: '#10B981',
    size: 'col-span-1 row-span-2',
    type: 'feature',
  },
  {
    id: 5,
    title: 'Global CDN',
    icon: Globe,
    color: '#06B6D4',
    size: 'col-span-1 row-span-1',
    type: 'icon',
  },
  {
    id: 6,
    title: 'AI Powered',
    description: 'Smart automation at your fingertips',
    icon: Sparkles,
    color: '#F43F5E',
    size: 'col-span-2 row-span-1',
    type: 'feature',
  },
  {
    id: 7,
    title: 'Growth Metrics',
    icon: TrendingUp,
    color: '#3B82F6',
    size: 'col-span-1 row-span-1',
    type: 'stat',
    value: '+245%',
  },
  {
    id: 8,
    title: '99.99% Uptime',
    icon: Clock,
    color: '#8B5CF6',
    size: 'col-span-1 row-span-1',
    type: 'stat',
  },
  {
    id: 9,
    title: 'Modular Design',
    icon: Layers,
    color: '#06B6D4',
    size: 'col-span-2 row-span-1',
    type: 'feature',
  },
];

function BentoCard({ item, index }: { item: typeof bentoItems[0]; index: number }) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className={`${item.size} bento-item`}
    >
      <div
        className="glass-card rounded-3xl p-6 h-full relative overflow-hidden group cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${item.color}08 0%, rgba(11, 18, 32, 0.6) 100%)`,
        }}
      >
        {/* Hover glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${item.color}20 0%, transparent 70%)`,
          }}
        />

        {/* Glass reflection */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div
            className="absolute -inset-full opacity-0 group-hover:opacity-20 transition-opacity duration-700"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${item.color}30 50%, transparent 70%)`,
              animation: 'shine-sweep 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* Content based on type */}
        {item.type === 'chart' && (
          <div className="relative h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${item.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div>
                <h3 className="font-display font-bold text-white">{item.title}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
              </div>
            </div>
            <div className="flex-1 flex items-end gap-2">
              {[35, 55, 45, 70, 60, 85, 75, 90, 65, 95, 80, 88].map((height, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${height}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="flex-1 rounded-t"
                  style={{
                    background: `linear-gradient(to top, ${item.color}, ${item.color}60)`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {item.type === 'icon' && (
          <div className="relative h-full flex flex-col items-center justify-center text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
              style={{
                background: `${item.color}20`,
                boxShadow: `0 0 30px ${item.color}15`,
              }}
            >
              <Icon className="w-7 h-7" style={{ color: item.color }} />
            </div>
            <h3 className="font-display font-semibold text-white text-sm">{item.title}</h3>
          </div>
        )}

        {item.type === 'feature' && (
          <div className="relative h-full flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${item.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div>
                <h3 className="font-display font-bold text-white">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                  )}
              </div>
            </div>
            {item.id === 6 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className="w-8 h-8 rounded-lg"
                      style={{
                        background: `${item.color}${30 + i * 10}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {item.id === 9 && (
              <div className="flex-1 flex items-center">
                <div className="grid grid-cols-3 gap-2 w-full">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="aspect-square rounded-lg"
                      style={{
                        background: `${item.color}15`,
                        border: `1px solid ${item.color}20`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {item.type === 'stat' && (
          <div className="relative h-full flex flex-col items-center justify-center text-center">
            <div
              className="text-3xl sm:text-4xl font-display font-bold mb-2"
              style={{ color: item.color }}
            >
              {item.value || '99.99%'}
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${item.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <h3 className="font-display font-semibold text-white text-sm">{item.title}</h3>
          </div>
        )}

        {/* Decorative corner */}
        <div
          className="absolute top-0 right-0 w-24 h-24 opacity-20"
          style={{
            background: `radial-gradient(circle at top right, ${item.color} 0%, transparent 70%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

export default function BentoGrid() {
  return (
    <section className="relative py-32 overflow-hidden" style={{ background: 'var(--bg-void)' }} id="bento">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
            top: '20%',
            right: '-10%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
            bottom: '10%',
            left: '-10%',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#F59E0B] mb-4">
            FEATURES AT A GLANCE
          </span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Powerful{' '}
            <span className="gradient-text">capabilities</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Everything you need in one beautifully designed platform.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] sm:auto-rows-[200px]">
          {bentoItems.map((item, index) => (
            <BentoCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
