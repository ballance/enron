import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ActivityHeatmap = ({ data }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 20, bottom: 40, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const cellWidth = width / 24;
    const cellHeight = height / 7;

    const maxCount = d3.max(data, d => d.count) || 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolateBlues);

    // Draw cells
    const cells = g.selectAll('.cell')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', d => d.hour * cellWidth)
      .attr('y', d => d.day * cellHeight)
      .attr('width', cellWidth - 1)
      .attr('height', cellHeight - 1)
      .attr('fill', d => d.count === 0 ? '#f3f4f6' : colorScale(d.count))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);

        const hour = d.hour % 12 || 12;
        const ampm = d.hour < 12 ? 'AM' : 'PM';
        const content = `${d.dayName} ${hour}${ampm}: ${d.count.toLocaleString()} emails`;

        setTooltip({
          show: true,
          x: event.pageX + 10,
          y: event.pageY - 10,
          content
        });
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1);

        setTooltip({ show: false, x: 0, y: 0, content: '' });
      });

    // X-axis (hours)
    const xAxis = d3.axisTop()
      .scale(d3.scaleBand().domain(hours).range([0, width]))
      .tickFormat(h => {
        const hour = h % 12 || 12;
        const ampm = h < 12 ? 'A' : 'P';
        return h % 3 === 0 ? `${hour}${ampm}` : '';
      });

    g.append('g')
      .attr('class', 'x-axis')
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6b7280');

    // Y-axis (days)
    const yAxis = d3.axisLeft()
      .scale(d3.scaleBand().domain(dayNames).range([0, height]));

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6b7280');

    // Legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = width - legendWidth;
    const legendY = -30;

    const legendScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => d.toLocaleString());

    const legend = g.append('g')
      .attr('transform', `translate(${legendX},${legendY})`);

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(d * maxCount));

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');

    legend.append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#6b7280');

  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg ref={svgRef} className="w-full" />
      {tooltip.show && (
        <div
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 text-sm pointer-events-none z-10"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default ActivityHeatmap;
