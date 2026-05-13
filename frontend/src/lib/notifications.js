import { supabase } from './supabaseClient';

export const notify = async (userId, title, message, type = 'info') => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert([
        { 
          user_id: userId, 
          title: title, 
          message: message, 
          type: type,
          is_read: false 
        }
      ]);

    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    // NDËRHYRJA KËTU: Printojmë error.message ose të gjithë objektin si string
    console.error('Error sending notification:', error.message || JSON.stringify(error));
    return { success: false, error };
  }
};