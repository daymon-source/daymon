// 임시 수정 스크립트
$content = Get-Content "src\App.jsx" -Raw -Encoding UTF8

# centerEgg 저장 부분을 currentEgg로 변경
$pattern = @'
      // centerEgg 저장
      if \(centerEgg\) \{
        const eggData = \{
          user_id: session\.user\.id,
          location: 'center_egg',
          element: centerEgg\.element,
          egg_type: centerEgg\.eggType,
          affection: centerEgg\.affection \|\| 0,
          bond_stage: centerEgg\.bondStage \|\| 1,
          is_hatched: false,
          created_at: now,
          updated_at: now,
        \}
        // 기존 id가 있으면 포함 \(DB 레코드 유지\)
        if \(centerEgg\.id\) \{
          eggData\.id = centerEgg\.id
        \}
        console\.log\('💾 Saving centerEgg:', eggData\)
        monstersToInsert\.push\(eggData\)
      \}
'@

$replacement = @'
      // 현재 보이는 부화장치의 알만 center_egg로 저장
      const currentEgg = incubatorEggs[currentIncubatorIndex]
      if (currentEgg) {
        const eggData = {
          user_id: session.user.id,
          location: 'center_egg',
          element: currentEgg.element,
          egg_type: currentEgg.eggType,
          affection: currentEgg.affection || 0,
          bond_stage: currentEgg.bondStage || 1,
          is_hatched: false,
          created_at: now,
          updated_at: now,
        }
        // 기존 id가 있으면 포함 (DB 레코드 유지)
        if (currentEgg.id) {
          eggData.id = currentEgg.id
        }
        console.log('💾 Saving center_egg:', eggData)
        monstersToInsert.push(eggData)
      }
'@

$content = $content -replace $pattern, $replacement
Set-Content "src\App.jsx" -Value $content -Encoding UTF8 -NoNewline
