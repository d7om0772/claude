// Template.tsx
import React, {useCallback, useMemo} from 'react';
import {
	AbsoluteFill,
	Audio,
	Easing,
	Img,
	Sequence,
	Video,
	interpolate,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import type {Caption, TemplateProps} from './schema';
import {FONT_STACK, FONT_WEIGHT_BLACK, FONT_WEIGHT_MEDIUM} from '../../lib/fonts';
import {sanitizeSaltIndices} from '../../lib/thmanyah-aesthetics';

/* ------------------------------------------------------------------ *
 * تجميع الكلمات في "مقاطع" (cues)
 * كل مقطع = شاشة واحدة من الترجمة، حجمها wordsPerLine * linesPerCue.
 * هذا هو المبدأ الذي يجعل الكلمات تتراكم بدل أن تختفي وتعود:
 * الكلمة تظهر عند startMs الخاص بها وتبقى حتى ينتهي المقطع كله.
 * ------------------------------------------------------------------ */
type Cue = {
	words: Caption[];
	startMs: number;
	endMs: number;
};

const buildCues = (
	captions: Caption[],
	wordsPerLine: number,
	linesPerCue: number,
	holdMs: number
): Cue[] => {
	const perCue = Math.max(1, wordsPerLine * linesPerCue);
	const chunks: Caption[][] = [];

	for (let i = 0; i < captions.length; i += perCue) {
		chunks.push(captions.slice(i, i + perCue));
	}

	return chunks.flatMap((words, index) => {
		const first = words[0];
		const last = words[words.length - 1];
		if (first === undefined || last === undefined) {
			return [];
		}
		// المقطع يبقى معروضاً حتى تبدأ الكلمة الأولى من المقطع التالي،
		// أو حتى نهاية آخر كلمة + مدة التثبيت إن كان المقطع الأخير.
		const nextFirst = chunks[index + 1]?.[0];
		const end = nextFirst ? nextFirst.startMs : last.endMs + holdMs;
		return [
			{
				words,
				startMs: first.startMs,
				endMs: Math.max(end, first.startMs + 1),
			},
		];
	});
};

const chunkRows = (words: Caption[], wordsPerLine: number): Caption[][] => {
	const rows: Caption[][] = [];
	const size = Math.max(1, wordsPerLine);
	for (let i = 0; i < words.length; i += size) {
		rows.push(words.slice(i, i + size));
	}
	return rows;
};

/* ------------------------------------------------------------------ *
 * كلمة واحدة داخل الترجمة
 * الحركة: ظهور + صعود بسيط + تكبير من popStartScale إلى 1.
 * كلها frame-based عبر interpolate — لا CSS animation ولا setTimeout،
 * حتى يكون الرندر مطابقاً للمعاينة فريماً بفريم.
 * ------------------------------------------------------------------ */
const CaptionWord: React.FC<{
	word: Caption;
	fontSize: number;
	gap: number;
	color: string;
	shadowOpacity: number;
	popDurationInFrames: number;
	popRiseRatio: number;
	popStartScale: number;
	saltEnabled: boolean;
}> = ({
	word,
	fontSize,
	gap,
	color,
	shadowOpacity,
	popDurationInFrames,
	popRiseRatio,
	popStartScale,
	saltEnabled,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const startFrame = (word.startMs / 1000) * fps;

	const progress = interpolate(
		frame,
		[startFrame, startFrame + popDurationInFrames],
		[0, 1],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.cubic),
		}
	);

	// قبل موعدها الكلمة مخفية تماماً ولا تحجز مساحة بصرية،
	// لكنها تبقى في الـ DOM حتى لا يتغير عرض السطر عند ظهورها.
	const rise = fontSize * popRiseRatio * (1 - progress);
	const scale = popStartScale + (1 - popStartScale) * progress;

	return (
		<span
			style={{
				display: 'inline-block',
				marginInlineStart: gap,
				opacity: progress,
				transform: `translateY(${rise}px) scale(${scale})`,
				color,
				// ظل ناعم غامق أسفل النص — يضمن قراءة النص فوق أي لقطة.
				textShadow: `0 ${fontSize * 0.09}px ${
					fontSize * 0.28
				}px rgba(0,0,0,${shadowOpacity})`,
				// الأحرف المرسلة: خاصية OpenType الخاصة بخط ثمانية.
				fontFeatureSettings: saltEnabled ? '"salt" 1' : '"salt" 0',
			}}
		>
			{word.text}
		</span>
	);
};

/* ------------------------------------------------------------------ *
 * كتلة الترجمة (المقطع النشط)
 * ------------------------------------------------------------------ */
const CaptionBlock: React.FC<{
	cue: Cue;
	fontFamily: string;
	fontSize: number;
	lineHeight: number;
	gap: number;
	color: string;
	shadowOpacity: number;
	wordsPerLine: number;
	popDurationInFrames: number;
	popRiseRatio: number;
	popStartScale: number;
	saltWordIndexes: number[];
}> = ({
	cue,
	fontFamily,
	fontSize,
	lineHeight,
	gap,
	color,
	shadowOpacity,
	wordsPerLine,
	popDurationInFrames,
	popRiseRatio,
	popStartScale,
	saltWordIndexes,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const currentMs = (frame / fps) * 1000;

	const rows = useMemo(
		() => chunkRows(cue.words, wordsPerLine),
		[cue.words, wordsPerLine]
	);

	// كثافة الأحرف المرسلة هنا «واحدة لكل سطر» لا لكل أربع كلمات، لأن وحدة
	// التنضيد في هذا القالب هي السطر. البقية من دليل ثمانية كما هي.
	const approvedSalt = useMemo(
		() =>
			new Set(
				sanitizeSaltIndices(
					cue.words.map((word) => word.text),
					saltWordIndexes,
					{maxPerWords: wordsPerLine}
				)
			),
		[cue.words, saltWordIndexes, wordsPerLine]
	);

	let globalIndex = 0;

	return (
		<div
			dir="rtl"
			style={{
				textAlign: 'right',
				fontFamily,
				fontWeight: 900,
				fontSize,
				lineHeight,
			}}
		>
			{rows.map((row, rowIndex) => {
				const rowStartMs = row[0]?.startMs ?? 0;
				// السطر بأكمله مخفي حتى تحين أول كلمة فيه،
				// حتى لا يترك فراغاً رأسياً فوق النص الظاهر.
				const rowVisible = currentMs >= rowStartMs;
				const cells = row.map((word) => {
					const index = globalIndex;
					globalIndex += 1;
					return (
						<CaptionWord
							key={`${index}-${word.startMs}`}
							word={word}
							fontSize={fontSize}
							gap={gap}
							color={color}
							shadowOpacity={shadowOpacity}
							popDurationInFrames={popDurationInFrames}
							popRiseRatio={popRiseRatio}
							popStartScale={popStartScale}
							saltEnabled={approvedSalt.has(index)}
						/>
					);
				});

				return (
					<div
						key={`row-${rowIndex}-${rowStartMs}`}
						style={{visibility: rowVisible ? 'visible' : 'hidden'}}
					>
						{cells}
					</div>
				);
			})}
		</div>
	);
};

/* ------------------------------------------------------------------ *
 * كتلة نصية ثابتة (تُستخدم حين لا توجد ترجمة)
 * تضمن أن القالب يعرض شيئاً جميلاً بلا صوت ولا كابشن.
 * ------------------------------------------------------------------ */
const StaticText: React.FC<{
	headline: string;
	subheadline?: string;
	fontFamily: string;
	fontSize: number;
	lineHeight: number;
	color: string;
	shadowOpacity: number;
	popDurationInFrames: number;
	popRiseRatio: number;
	popStartScale: number;
}> = ({
	headline,
	subheadline,
	fontFamily,
	fontSize,
	lineHeight,
	color,
	shadowOpacity,
	popDurationInFrames,
	popRiseRatio,
	popStartScale,
}) => {
	const frame = useCurrentFrame();

	const appear = useCallback(
		(delayInFrames: number): {opacity: number; transform: string} => {
			const p = interpolate(
				frame,
				[delayInFrames, delayInFrames + popDurationInFrames],
				[0, 1],
				{
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
					easing: Easing.out(Easing.cubic),
				}
			);
			const rise = fontSize * popRiseRatio * (1 - p);
			const scale = popStartScale + (1 - popStartScale) * p;
			return {
				opacity: p,
				transform: `translateY(${rise}px) scale(${scale})`,
			};
		},
		[frame, fontSize, popDurationInFrames, popRiseRatio, popStartScale]
	);

	// 9 و 20 فريم: نفس إيقاع ظهور أول كلمتين في وضع الترجمة (0.30s و 0.66s @30fps)
	const headlineStyle = appear(9);
	const subStyle = appear(20);

	return (
		<div
			dir="rtl"
			style={{
				textAlign: 'right',
				fontFamily,
				lineHeight,
				color,
				textShadow: `0 ${fontSize * 0.09}px ${
					fontSize * 0.28
				}px rgba(0,0,0,${shadowOpacity})`,
			}}
		>
			<div style={{fontWeight: FONT_WEIGHT_BLACK, fontSize, ...headlineStyle}}>
				{headline}
			</div>
			{subheadline ? (
				<div
					style={{
						fontWeight: 500,
						fontSize: fontSize * 0.62,
						marginTop: fontSize * 0.22,
						...subStyle,
					}}
				>
					{subheadline}
				</div>
			) : null}
		</div>
	);
};

/* ------------------------------------------------------------------ *
 * الوسائط داخل البطاقة
 * ------------------------------------------------------------------ */
const isVideoSource = (src: string): boolean =>
	/\.(mp4|mov|webm|m4v)$/i.test(src);

const CardMedia: React.FC<{
	media?: string;
	placeholderText: string;
	placeholderColor: string;
	fontFamily: string;
	fontSize: number;
}> = ({media, placeholderText, placeholderColor, fontFamily, fontSize}) => {
	if (!media) {
		return (
			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					color: placeholderColor,
					fontFamily,
					fontWeight: 500,
					fontSize,
				}}
			>
				{placeholderText}
			</AbsoluteFill>
		);
	}

	const src = media.startsWith('http') ? media : staticFile(media);
	const fill: React.CSSProperties = {
		width: '100%',
		height: '100%',
		objectFit: 'cover',
	};

	if (isVideoSource(media)) {
		return <Video src={src} style={fill} />;
	}
	return <Img src={src} style={fill} />;
};

/* ------------------------------------------------------------------ *
 * المكوّن الرئيسي
 * ------------------------------------------------------------------ */
export const Template: React.FC<TemplateProps> = ({
	backgroundColor,
	cardColor,
	fontColor,
	placeholderColor,
	logo,
	headline,
	subheadline,
	media,
	voiceover,
	captions,
	cardInsetXRatio,
	cardInsetYRatio,
	cardInsetTopWithLogoRatio,
	cardInsetBottomWithLogoRatio,
	cardRadiusRatio,
	logoTopRatio,
	logoHeightRatio,
	captionTopRatio,
	captionRightRatio,
	captionLeftRatio,
	captionFontSizeRatio,
	captionLineHeight,
	wordGapRatio,
	wordsPerLine,
	linesPerCue,
	cueHoldMs,
	popDurationInFrames,
	popRiseRatio,
	popStartScale,
	shadowOpacity,
	placeholderText,
	saltWordIndexes,
}) => {
	const {width, height, fps} = useVideoConfig();
	const frame = useCurrentFrame();

	const hasLogo = Boolean(logo);

	// هوامش البطاقة: حين يوجد شعار تنزل البطاقة لتفسح له مكاناً،
	// وحين لا يوجد تتوسط الكادر بهوامش متساوية فوق وتحت.
	const insetTop = hasLogo ? cardInsetTopWithLogoRatio : cardInsetYRatio;
	const insetBottom = hasLogo ? cardInsetBottomWithLogoRatio : cardInsetYRatio;

	const cardLeft = width * cardInsetXRatio;
	const cardWidth = width - cardLeft * 2;
	const cardTop = height * insetTop;
	const cardHeight = height - cardTop - height * insetBottom;

	const fontSize = width * captionFontSizeRatio;
	const wordGap = width * wordGapRatio;

	const cues = useMemo(
		() => buildCues(captions, wordsPerLine, linesPerCue, cueHoldMs),
		[captions, wordsPerLine, linesPerCue, cueHoldMs]
	);

	const currentMs = (frame / fps) * 1000;
	const activeCue = cues.find(
		(cue) => currentMs >= cue.startMs && currentMs < cue.endMs
	);

	return (
		<AbsoluteFill style={{backgroundColor}}>
			{voiceover ? (
				<Audio
					src={
						voiceover.startsWith('http') ? voiceover : staticFile(voiceover)
					}
				/>
			) : null}

			{/* الطبقة ١: الشعار (اختياري) */}
			{logo ? (
				<Sequence from={0} name="logo">
					<AbsoluteFill
						style={{
							alignItems: 'center',
							justifyContent: 'flex-start',
							paddingTop: height * logoTopRatio,
						}}
					>
						<Img
							src={logo.startsWith('http') ? logo : staticFile(logo)}
							style={{
								height: height * logoHeightRatio,
								objectFit: 'contain',
							}}
						/>
					</AbsoluteFill>
				</Sequence>
			) : null}

			{/* الطبقة ٢: بطاقة الوسائط بحواف دائرية */}
			<Sequence from={0} name="card">
				<AbsoluteFill>
					<div
						style={{
							position: 'absolute',
							left: cardLeft,
							top: cardTop,
							width: cardWidth,
							height: cardHeight,
							backgroundColor: cardColor,
							borderRadius: width * cardRadiusRatio,
							overflow: 'hidden',
						}}
					>
						<CardMedia
							media={media}
							placeholderText={placeholderText}
							placeholderColor={placeholderColor}
							fontFamily={FONT_STACK}
							fontSize={fontSize * 0.56}
						/>

						{/* الطبقة ٣: الترجمة داخل البطاقة، أعلى اليمين */}
						<div
							style={{
								position: 'absolute',
								top: cardHeight * captionTopRatio,
								right: cardWidth * captionRightRatio,
								left: cardWidth * captionLeftRatio,
							}}
						>
							{activeCue ? (
								<CaptionBlock
									cue={activeCue}
									fontFamily={FONT_STACK}
									fontSize={fontSize}
									lineHeight={captionLineHeight}
									gap={wordGap}
									color={fontColor}
									shadowOpacity={shadowOpacity}
									wordsPerLine={wordsPerLine}
									popDurationInFrames={popDurationInFrames}
									popRiseRatio={popRiseRatio}
									popStartScale={popStartScale}
									saltWordIndexes={saltWordIndexes}
								/>
							) : captions.length === 0 ? (
								<StaticText
									headline={headline}
									subheadline={subheadline}
									fontFamily={FONT_STACK}
									fontSize={fontSize}
									lineHeight={captionLineHeight}
									color={fontColor}
									shadowOpacity={shadowOpacity}
									popDurationInFrames={popDurationInFrames}
									popRiseRatio={popRiseRatio}
									popStartScale={popStartScale}
								/>
							) : null}
						</div>
					</div>
				</AbsoluteFill>
			</Sequence>
		</AbsoluteFill>
	);
};
