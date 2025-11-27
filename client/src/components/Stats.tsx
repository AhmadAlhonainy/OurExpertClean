const stats = [
  { value: "+500", label: "مرشد خبير" },
  { value: "+10,000", label: "جلسة مكتملة" },
  { value: "4.9", label: "متوسط التقييم" },
  { value: "%95", label: "نسبة الرضا" },
];

export default function Stats() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-display font-bold text-4xl sm:text-5xl text-primary mb-2" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </div>
              <div className="text-muted-foreground text-sm sm:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
