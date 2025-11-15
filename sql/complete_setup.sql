-- 完整的数据库设置脚本
-- 在 Supabase SQL Editor 中按顺序执行以下内容

-- 1. 首先确保表已创建（如果还没有）
-- 执行 sql/supabase.sql 中的表创建语句

-- 2. 添加 INSERT 策略（如果还没有）
CREATE POLICY IF NOT EXISTS "用户可以创建自己的资料"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. 创建触发器函数和触发器（自动创建用户资料）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 尝试插入用户资料，如果已存在则忽略
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

