"use client"

import { useRef, useEffect, useState } from "react"

interface SquaresProps {
  direction?: "right" | "left" | "up" | "down" | "diagonal"
  speed?: number
  borderColor?: string
  squareSize?: number
  hoverFillColor?: string
  className?: string
}

export function Squares({
  direction = "right",
  speed = 1,
  borderColor = "rgba(0, 0, 0, 0.1)",
  squareSize = 40,
  hoverFillColor = "rgba(0, 0, 0, 0.05)",
  className,
}: SquaresProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number | null>(null)
  const numSquaresX = useRef<number>(0)
  const numSquaresY = useRef<number>(0)
  const gridOffset = useRef({ x: 0, y: 0 })
  const [hoveredSquare, setHoveredSquare] = useState<{
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      numSquaresX.current = Math.ceil(canvas.width / squareSize) + 4
      numSquaresY.current = Math.ceil(canvas.height / squareSize) + 4
    }

    const drawSquares = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = -2; i < numSquaresX.current; i++) {
        for (let j = -2; j < numSquaresY.current; j++) {
          const x = i * squareSize + gridOffset.current.x
          const y = j * squareSize + gridOffset.current.y

          if (x > -squareSize && x < canvas.width + squareSize && y > -squareSize && y < canvas.height + squareSize) {
            ctx.strokeStyle = borderColor
            ctx.lineWidth = 1
            ctx.strokeRect(x, y, squareSize, squareSize)

            // Fill hovered square
            if (
              hoveredSquare &&
              hoveredSquare.x === i + 2 &&
              hoveredSquare.y === j + 2
            ) {
              ctx.fillStyle = hoverFillColor
              ctx.fillRect(x, y, squareSize, squareSize)
            }
          }
        }
      }
    }

    const updateAnimation = () => {
      const effectiveSpeed = Math.max(speed, 0.1)

      switch (direction) {
        case "right":
          gridOffset.current.x =
            (gridOffset.current.x - effectiveSpeed + squareSize) % squareSize
          break
        case "left":
          gridOffset.current.x =
            (gridOffset.current.x + effectiveSpeed + squareSize) % squareSize
          break
        case "up":
          gridOffset.current.y =
            (gridOffset.current.y + effectiveSpeed + squareSize) % squareSize
          break
        case "down":
          gridOffset.current.y =
            (gridOffset.current.y - effectiveSpeed + squareSize) % squareSize
          break
        case "diagonal":
          gridOffset.current.x =
            (gridOffset.current.x - effectiveSpeed + squareSize) % squareSize
          gridOffset.current.y =
            (gridOffset.current.y - effectiveSpeed + squareSize) % squareSize
          break
      }

      drawSquares()
      requestRef.current = requestAnimationFrame(updateAnimation)
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      const hoveredSquareX = Math.floor(
        (mouseX - gridOffset.current.x) / squareSize
      ) + 2
      const hoveredSquareY = Math.floor(
        (mouseY - gridOffset.current.y) / squareSize
      ) + 2

      setHoveredSquare({ x: hoveredSquareX, y: hoveredSquareY })
    }

    const handleMouseLeave = () => {
      setHoveredSquare(null)
    }

    window.addEventListener("resize", resizeCanvas)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    resizeCanvas()
    requestRef.current = requestAnimationFrame(updateAnimation)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [direction, speed, borderColor, hoverFillColor, hoveredSquare, squareSize])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className || ""}`}
      style={{ 
        width: "100%", 
        height: "100%",
        background: "transparent"
      }}
    />
  )
}