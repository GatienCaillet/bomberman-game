// Export des images image_gen : grille 64×64, palette réduite, PNG 256×256.
// Usage : swift export-sprites.swift source.png destination.png couleurs [...]
import AppKit
import Foundation

typealias RGB = SIMD3<Double>
let logicalSize = 64
let scale = 4

func distance(_ a: RGB, _ b: RGB) -> Double {
    let d = a - b
    return d.x * d.x + d.y * d.y + d.z * d.z
}

func nearest(_ color: RGB, _ palette: [RGB]) -> Int {
    var best = 0
    var score = Double.infinity
    for (index, entry) in palette.enumerated() {
        let candidate = distance(color, entry)
        if candidate < score { best = index; score = candidate }
    }
    return best
}

func exportSprite(source: String, destination: String, colors: Int) throws {
    let data = try Data(contentsOf: URL(fileURLWithPath: source))
    guard let input = NSBitmapImageRep(data: data) else {
        throw NSError(domain: "SpriteExport", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Image illisible : \(source)"])
    }
    var samples = [RGB?](repeating: nil, count: logicalSize * logicalSize)
    for y in 0..<logicalSize {
        for x in 0..<logicalSize {
            let sx = min(input.pixelsWide - 1, (2 * x + 1) * input.pixelsWide / (2 * logicalSize))
            let sy = min(input.pixelsHigh - 1, (2 * y + 1) * input.pixelsHigh / (2 * logicalSize))
            if let c = input.colorAt(x: sx, y: sy)?.usingColorSpace(.deviceRGB),
               c.alphaComponent >= 0.5 {
                samples[y * logicalSize + x] = RGB(Double(c.redComponent),
                                                  Double(c.greenComponent), Double(c.blueComponent))
            }
        }
    }
    let opaque = samples.compactMap { $0 }
    guard let first = opaque.first else {
        throw NSError(domain: "SpriteExport", code: 2,
                      userInfo: [NSLocalizedDescriptionKey: "Image vide : \(source)"])
    }
    // Palette déterministe, sans tramage ; les grandes plages restent unies.
    var palette = [first]
    while palette.count < colors {
        let next = opaque.max {
            distance($0, palette[nearest($0, palette)]) < distance($1, palette[nearest($1, palette)])
        }!
        if distance(next, palette[nearest(next, palette)]) < 0.00001 { break }
        palette.append(next)
    }
    for _ in 0..<20 {
        var sums = [RGB](repeating: .zero, count: palette.count)
        var counts = [Int](repeating: 0, count: palette.count)
        for color in opaque {
            let index = nearest(color, palette)
            sums[index] += color
            counts[index] += 1
        }
        for index in palette.indices where counts[index] > 0 {
            palette[index] = sums[index] / Double(counts[index])
        }
    }
    let output = NSBitmapImageRep(bitmapDataPlanes: nil,
        pixelsWide: logicalSize * scale, pixelsHigh: logicalSize * scale,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    for y in 0..<logicalSize {
        for x in 0..<logicalSize {
            var color = NSColor(deviceRed: 0, green: 0, blue: 0, alpha: 0)
            if let sample = samples[y * logicalSize + x] {
                let p = palette[nearest(sample, palette)]
                color = NSColor(deviceRed: CGFloat((p.x * 255).rounded() / 255),
                                green: CGFloat((p.y * 255).rounded() / 255),
                                blue: CGFloat((p.z * 255).rounded() / 255), alpha: 1)
            }
            for dy in 0..<scale {
                for dx in 0..<scale {
                    output.setColor(color, atX: x * scale + dx, y: y * scale + dy)
                }
            }
        }
    }
    let destinationURL = URL(fileURLWithPath: destination)
    try FileManager.default.createDirectory(at: destinationURL.deletingLastPathComponent(),
                                           withIntermediateDirectories: true)
    try output.representation(using: .png, properties: [:])!.write(to: destinationURL,
                                                                 options: .withoutOverwriting)
    print("\(destination) : 256×256, \(palette.count) couleurs, alpha binaire")
}

let arguments = Array(CommandLine.arguments.dropFirst())
guard !arguments.isEmpty, arguments.count.isMultiple(of: 3) else {
    fatalError("Usage : swift export-sprites.swift source.png destination.png couleurs [...]")
}
for index in stride(from: 0, to: arguments.count, by: 3) {
    guard let colors = Int(arguments[index + 2]), (2...64).contains(colors) else {
        fatalError("Nombre de couleurs attendu : 2...64")
    }
    try exportSprite(source: arguments[index], destination: arguments[index + 1], colors: colors)
}
