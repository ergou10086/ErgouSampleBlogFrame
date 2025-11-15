-- 修复 user_profiles 表的 INSERT 策略
-- 在 Supabase SQL Editor 中执行此文件

-- 添加 INSERT 策略，允许用户创建自己的资料
CREATE POLICY "用户可以创建自己的资料"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

